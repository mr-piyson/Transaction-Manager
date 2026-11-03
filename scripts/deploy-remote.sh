#!/bin/bash
#
# deploy-remote.sh — deploy the latest origin/main to the remote Ubuntu server
# and stream the result.
#
# The remote deploy is launched detached (setsid + nohup) so a dropped SSH
# connection cannot kill it: re-running this script detects the running deploy
# via ${DEPLOY_PATH}/deploy.pid and re-attaches to its log.
#
# Reads DEPLOY_HOST and DEPLOY_PATH (plus optional DEPLOY_HEALTH_URL) from .env.
# Any extra arguments are forwarded to scripts/deploy.sh on the server
# (e.g. --force, --no-maintenance, --skip-db).
#
# Usage: bun deploy:remote   |   bash ./scripts/deploy-remote.sh [deploy.sh options]
#
# To deploy a specific branch:  DEPLOY_BRANCH=feature bash ./scripts/deploy-remote.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY-REMOTE]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() {
	echo -e "${RED}[ERROR]${NC} $1" >&2
	exit 1
}

echo "========================================="
echo "  Transaction Manager Remote Deployment"
echo "========================================="
echo ""

# --- Load .env ---
if [ ! -f "${ENV_FILE}" ]; then
	error ".env file not found at ${ENV_FILE}"
fi

read_env() {
	grep -E "^$1=" "${ENV_FILE}" | tail -n 1 | cut -d'=' -f2- | tr -d '"' | tr -d "'"
}

DEPLOY_HOST="$(read_env DEPLOY_HOST)"
DEPLOY_PATH="$(read_env DEPLOY_PATH)"
DEPLOY_HEALTH_URL="$(read_env DEPLOY_HEALTH_URL)"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

[ -n "${DEPLOY_HOST}" ] || error "DEPLOY_HOST not set in .env"
[ -n "${DEPLOY_PATH}" ] || error "DEPLOY_PATH not set in .env"

DEPLOY_LOG="${DEPLOY_PATH}/deploy.log"
DEPLOY_PID="${DEPLOY_PATH}/deploy.pid"

# Extra arguments are shell-quoted so they survive the trip through ssh.
EXTRA_ARGS=""
if [ "$#" -gt 0 ]; then
	EXTRA_ARGS="$(printf ' %q' "$@")"
fi

SSH_OPTIONS=(-o ConnectTimeout=10 -o ServerAliveInterval=30 -o ServerAliveCountMax=6)

log "Target: ${DEPLOY_HOST}:${DEPLOY_PATH} (branch ${DEPLOY_BRANCH})"
echo ""

# --- Kick off (or attach to) a detached deploy so an SSH drop cannot kill it ---
RUNNING="$(ssh "${SSH_OPTIONS[@]}" "${DEPLOY_HOST}" "if [ -f \"${DEPLOY_PID}\" ] && kill -0 \"\$(cat \"${DEPLOY_PID}\" 2>/dev/null)\" 2>/dev/null; then echo yes; fi" 2>/dev/null || true)"

if [ -n "${RUNNING}" ]; then
	log "A deployment already appears to be running on the server; attaching to its log."
else
	log "Launching detached deploy on ${DEPLOY_HOST}..."
	ENV_OVERRIDES=""
	if [ -n "${DEPLOY_HEALTH_URL}" ]; then
		ENV_OVERRIDES="DEPLOY_HEALTH_URL=${DEPLOY_HEALTH_URL}"
	fi
	# The launch also waits server-side for deploy.pid: a fully cached deploy can
	# finish in about a second, which is far too short for client-side polling.
	# Fast no-op deploys finish so quickly that they delete ${DEPLOY_PID} before
	# the pid-capture loop below runs, so the pid printed by the launch loop is
	# kept as the primary source (numeric-only line).
	LAUNCH_OUT="$(ssh "${SSH_OPTIONS[@]}" "${DEPLOY_HOST}" "export PATH=\"\$HOME/.bun/bin:\$PATH\"; cd \"${DEPLOY_PATH}\" && setsid nohup env ${ENV_OVERRIDES} ./scripts/deploy.sh -b \"${DEPLOY_BRANCH}\" -y${EXTRA_ARGS} > \"${DEPLOY_LOG}\" 2>&1 < /dev/null & for _ in \$(seq 1 100); do if [ -s \"${DEPLOY_PID}\" ]; then cat \"${DEPLOY_PID}\"; break; fi; sleep 0.1; done" )"
	[ $? -eq 0 ] || { echo "${LAUNCH_OUT}"; error "Could not launch the remote deploy on ${DEPLOY_HOST}"; }
	REMOTE_PID_FROM_LAUNCH="$(printf '%s\n' "${LAUNCH_OUT}" | grep -E '^[0-9]+$' | tail -n 1 || true)"
fi

# --- Pick up the remote deploy pid (written by deploy.sh on startup) ---
# The pid from the launch output wins (it cannot be lost to the cleanup race);
# the loop below only runs when the launch did not print one.
REMOTE_PID="${REMOTE_PID_FROM_LAUNCH:-}"
for _ in $(seq 1 10); do
	case "${REMOTE_PID}" in
	'' | *[!0-9]*) REMOTE_PID="" ;;
	*) break ;;
	esac
	REMOTE_PID="$(ssh "${SSH_OPTIONS[@]}" "${DEPLOY_HOST}" "cat \"${DEPLOY_PID}\" 2>/dev/null" 2>/dev/null || true)"
	if [ -n "${REMOTE_PID}" ]; then break; fi
	sleep 1
done

if [ -n "${REMOTE_PID}" ]; then
	log "Deploy process on server (pid ${REMOTE_PID}). Log: ${DEPLOY_LOG}"
else
	warn "Could not read the remote deploy pid. Streaming until a completion marker appears in the log."
fi

# --- Stream the log until a completion marker is printed ---
# If this SSH connection drops, the deploy keeps running on the server.
# Re-run this script to re-attach: it detects the running deploy and resumes monitoring.
# Both stream variants are bound by a remote `timeout`:
#   - pid known: tail until the deploy process dies
#   - pid unknown: poll the log until a marker appears, then print it once —
#     a blind `tail -f` would just sit there for the full timeout because nothing
#     asks it to stop
TAIL_CMD="timeout 1800 sh -c 'until grep -qE \"DEPLOY_(SUCCESS|FAILED)\" \"\$1\" 2>/dev/null; do sleep 1; done; tail -n +1 \"\$1\"' sh \"${DEPLOY_LOG}\""
if [ -n "${REMOTE_PID}" ]; then
	TAIL_CMD="timeout 1800 tail -f --pid=${REMOTE_PID} -n +1 \"${DEPLOY_LOG}\""
fi

log "Streaming deployment output (Ctrl-C detaches; the deploy continues on the server)..."
echo ""

set +e
# No local `timeout` wrapper: macOS has no coreutils timeout, and the remote
# command already bounds itself (remote `timeout 1800`, always).
# The marker is captured as it streams, so a failed follow-up round-trip
# cannot lose an outcome we already observed.
MARKER="$(ssh "${SSH_OPTIONS[@]}" "${DEPLOY_HOST}" "${TAIL_CMD}" 2>/dev/null |
	awk '/DEPLOY_(SUCCESS|FAILED)/{print $0; fflush(); exit} {print; fflush()}')"
STREAM_STATUS=${PIPESTATUS[0]}
set -e

echo ""

# --- Fetch the final result marker from the server log (fallback + retries) ---
STATUS="${MARKER}"
if [ -z "${STATUS}" ]; then
	for _ in 1 2 3; do
		STATUS="$(ssh "${SSH_OPTIONS[@]}" "${DEPLOY_HOST}" "grep -hE 'DEPLOY_(SUCCESS|FAILED)' \"${DEPLOY_LOG}\" | tail -n 1" 2>/dev/null || true)"
		case "${STATUS}" in
		*DEPLOY_SUCCESS* | *DEPLOY_FAILED*) break ;;
		*) STATUS="" ;; # transient failure — the marker is still being written
		esac
		sleep 2
	done
fi

case "${STATUS}" in
*DEPLOY_SUCCESS*)
	log "========================================="
	log "  Deployment Complete!"
	log "========================================="
	log "Check the service: ssh ${DEPLOY_HOST} 'sudo systemctl status transaction-manager'"
	;;
*DEPLOY_FAILED*)
	error "Deployment failed on the server (the previous build was restored if applicable). Full log: ${DEPLOY_LOG}"
	;;
*)
	if [ "${STREAM_STATUS}" -eq 124 ]; then
		error "Timed out waiting for the deploy after 30 minutes. It may still be running. Resume with: ssh ${DEPLOY_HOST} 'tail -f ${DEPLOY_LOG}'"
	fi
	error "No result marker found (interrupted?). The deploy continues on the server if it is still running. Resume with: ssh ${DEPLOY_HOST} 'tail -f ${DEPLOY_LOG}'"
	;;
esac
