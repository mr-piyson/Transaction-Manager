#!/usr/bin/env bash
#
# deploy.sh — pull latest code, install dependencies, sync the database
# schema, build, and restart the transaction-manager systemd service.
#
# Usage: ./scripts/deploy.sh [options]
#
# Options:
#   -b, --branch <name>     Branch to deploy            (default: main)
#   -s, --service <name>    Systemd unit to restart     (default: transaction-manager)
#   -y, --yes               Non-interactive; discard local changes without asking
#   -f, --force             Rebuild even if already on latest commit
#       --skip-db           Skip prisma generate + db push
#       --no-restart        Stop before restarting the service
#       --no-healthcheck    Skip post-deploy health check
#       --no-rollback       Do not roll back automatically if health check fails
#   -h, --help              Show this help
#
# Environment overrides:
#   DEPLOY_HEALTH_URL       URL to poll after restart (default: http://127.0.0.1:3000)
#   DEPLOY_LOG_DIR          Where deploy logs are written (default: .deploy-logs)

set -Eeuo pipefail

BRANCH="main"
SERVICE="transaction-manager"
ASSUME_YES=false
FORCE=false
SKIP_DB=false
DO_RESTART=true
DO_HEALTHCHECK=true
AUTO_ROLLBACK=true

while [[ $# -gt 0 ]]; do
	case "$1" in
	-b | --branch)
		BRANCH="$2"
		shift 2
		;;
	-s | --service)
		SERVICE="$2"
		shift 2
		;;
	-y | --yes)
		ASSUME_YES=true
		shift
		;;
	-f | --force)
		FORCE=true
		shift
		;;
	--skip-db)
		SKIP_DB=true
		shift
		;;
	--no-restart)
		DO_RESTART=false
		DO_HEALTHCHECK=false
		shift
		;;
	--no-healthcheck)
		DO_HEALTHCHECK=false
		shift
		;;
	--no-rollback)
		AUTO_ROLLBACK=false
		shift
		;;
	-h | --help)
		grep '^#' "$0" | cut -c 3-
		exit 0
		;;
	*)
		echo "Unknown option: $1 (see --help)" >&2
		exit 64
		;;
	esac
done

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HEALTH_URL="${DEPLOY_HEALTH_URL:-http://127.0.0.1:3000}"
LOG_DIR="${DEPLOY_LOG_DIR:-$APP_DIR/.deploy-logs}"
LOG_FILE="$LOG_DIR/deploy-$(date +%Y%m%d-%H%M%S).log"
LOCK_DIR="/tmp/${SERVICE}.deploy.lock"

STEP=""
PREV_SHA=""
DEPLOYED=false

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m ✓ \033[0m%s\n' "$*"; }
warn() { printf '\033[1;33m ! \033[0m%s\n' "$*"; }
die() {
	printf '\033[1;31m ✗ \033[0m%s\n' "$*" >&2
	[[ -n "${STEP}" ]] && echo "Failed during step: ${STEP}" >&2
	exit 1
}

cleanup() {
	local code=$?
	rmdir "$LOCK_DIR" 2>/dev/null || true
	if [[ $code -ne 0 && "$DEPLOYED" == true ]]; then
		warn "Deploy finished with errors — service state may be inconsistent."
	fi
}
trap cleanup EXIT

on_error() {
	die "Command failed at ${BASH_SOURCE[1]}:${BASH_LINENO[0]} (exit $1)"
}
trap 'on_error $?' ERR

mkdir "$LOCK_DIR" 2>/dev/null || die "Another deploy of '${SERVICE}' appears to be running (${LOCK_DIR})."

cd "$APP_DIR"

log "Preflight checks"
[[ -d .git ]] || die "$APP_DIR is not a git repository."
[[ -f .env ]] || die ".env not found — copy .env.example and configure secrets first."
command -v git >/dev/null || die "git is not installed."
command -v bun >/dev/null || die "bun is not installed."
git fetch origin "$BRANCH" >/dev/null 2>&1 || die "Cannot fetch origin/${BRANCH}. Check network and remotes."
git rev-parse --verify --quiet "origin/${BRANCH}" >/dev/null || die "Branch origin/${BRANCH} does not exist."

if command -v systemctl >/dev/null && [ "$(id -u)" -ne 0 ]; then
	systemctl cat "$SERVICE" >/dev/null 2>&1 || warn "Systemd unit '${SERVICE}' not found; restart step will fail."
fi

PREV_SHA="$(git rev-parse --short HEAD)"
TARGET_SHA="$(git rev-parse --short "origin/${BRANCH}")"

if [[ "$PREV_SHA" == "$TARGET_SHA" && "$FORCE" != true ]]; then
	log "Already on origin/${BRANCH} (${PREV_SHA}); nothing to deploy."
	log "Use --force to rebuild anyway."
	exit 0
fi

DIRTY=$(git status --porcelain | wc -l | tr -d ' ')
if [[ "$DIRTY" -gt 0 && "$ASSUME_YES" != true ]]; then
	warn "Working tree has ${DIRTY} uncommitted change(s) that will be DISCARDED:"
	git status --short
	read -r -p "Continue? [y/N] " reply
	[[ "$reply" =~ ^[Yy]$ ]] || die "Aborted by user."
fi

mkdir -p "$LOG_DIR"

deploy() {
	local sha="$1"
	STEP="syncing code"
	log "Syncing code to origin/${BRANCH} (${sha})"
	git reset --hard "origin/${BRANCH}" >/dev/null
	git clean -fd >/dev/null
	ok "Code synced (local changes discarded, ignored files like .env/.data preserved)"

	if [[ "$(git rev-parse --short HEAD)" != "$sha" ]]; then
		die "Post-reset commit mismatch: expected ${sha}, got $(git rev-parse --short HEAD)"
	fi

	STEP="installing dependencies"
	log "Installing dependencies (bun)"
	NODE_ENV=production bun install --frozen-lockfile >/dev/null
	ok "Dependencies installed"

	if [[ "$SKIP_DB" != true ]]; then
		STEP="syncing database schema"
		log "Generating Prisma client"
		bunx prisma generate >/dev/null
		log "Pushing schema to database (prompts on destructive changes)"
		bunx prisma db push
		ok "Database schema in sync"
	fi

	STEP="building"
	log "Building application"
	NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production bun run build >"$LOG_DIR/build-$(date +%Y%m%d-%H%M%S).log" 2>&1 ||
		die "Build failed — see $LOG_DIR. Old process is still running."
	ok "Build succeeded"
}

restart_service() {
	STEP="restarting ${SERVICE}"
	log "Restarting ${SERVICE}"
	if [ "$(id -u)" -eq 0 ]; then
		systemctl restart "$SERVICE"
	elif command -v sudo >/dev/null; then
		sudo systemctl restart "$SERVICE"
	else
		die "Need root or sudo to restart ${SERVICE}."
	fi
	ok "Service restarted"
}

health_check() {
	STEP="health check"
	log "Waiting for ${HEALTH_URL} to become healthy"
	local attempts=30
	for ((i = 1; i <= attempts; i++)); do
		status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$HEALTH_URL" || true)
		if [[ "$status" =~ ^[23] ]] || [[ "$status" == "401" ]] || [[ "$status" == "404" ]]; then
			ok "Healthy (HTTP ${status}) after attempt ${i}/${attempts}"
			return 0
		fi
		sleep 2
	done
	warn "Health check failed after ${attempts} attempts (last status: ${status:-none})"
	return 1
}

rollback() {
	warn "Rolling back to previous commit ${PREV_SHA}"
	git reset --hard "$PREV_SHA" >/dev/null || die "Cannot reset to ${PREV_SHA}."
	NODE_ENV=production bun install --frozen-lockfile >/dev/null 2>&1 || true
	bunx prisma generate >/dev/null 2>&1 || true
	NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production bun run build >"$LOG_DIR/rollback-build.log" 2>&1 ||
		die "Rollback build failed — manual intervention required. See $LOG_DIR/rollback-build.log"
	restart_service
	if health_check; then
		ok "Rolled back to ${PREV_SHA} and healthy."
	else
		die "Rolled back to ${PREV_SHA} but service is still unhealthy — check journalctl -u ${SERVICE}."
	fi
}

deploy "$TARGET_SHA"
DEPLOYED=true

if [[ "$DO_RESTART" == true ]]; then
	restart_service
	if [[ "$DO_HEALTHCHECK" == true ]]; then
		if ! health_check; then
			if [[ "$AUTO_ROLLBACK" == true ]]; then
				rollback
			else
				die "Deployment unhealthy and rollback disabled — check journalctl -u ${SERVICE}."
			fi
		fi
	fi
else
	log "Skipping restart (--no-restart). Run manually:"
	echo "  sudo systemctl restart ${SERVICE}"
fi

NEW_SHA="$(git rev-parse --short HEAD)"
{
	echo "$(date '+%F %T') branch=${BRANCH} ${PREV_SHA} -> ${NEW_SHA} by=${USER:-unknown} host=$(hostname)"
} >>"$APP_DIR/.deploy-history.log"

log "Deploy complete: ${PREV_SHA} → ${NEW_SHA} (origin/${BRANCH})"
