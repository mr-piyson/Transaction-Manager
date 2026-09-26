#!/usr/bin/env bash
#
# deploy.sh — pull latest code, verify the database, ensure the systemd
# unit exists, install dependencies, sync the database schema, build,
# and restart the transaction-manager systemd service.
#
# Ubuntu server provisioning (runs during preflight):
#   - Verifies PostgreSQL from DATABASE_URL in .env (reachability + auth)
#   - Creates /etc/systemd/system/<service>.service if missing, using this
#     repo as WorkingDirectory and the detected bun binary in ExecStart
#
# Usage: ./scripts/deploy.sh [options]
#
# Options:
#   -b, --branch <name>     Branch to deploy            (default: main)
#   -s, --service <name>    Systemd unit to restart     (default: transaction-manager)
#   -y, --yes               Non-interactive; discard local changes without asking
#                          (implied automatically when stdin is not a TTY)
#   -f, --force             Rebuild even if already on latest commit
#       --skip-db           Skip database checks, prisma generate + db push
#       --no-restart        Stop before restarting the service
#       --no-healthcheck    Skip post-deploy health check
#       --no-rollback       Do not roll back automatically if health check fails
#       --no-maintenance    Never show the maintenance page during the deploy
#       --clear-maintenance Take the site out of maintenance mode and exit
#   -h, --help              Show this help
#
# Environment overrides:
#   DEPLOY_HEALTH_URL       Comma-separated URL(s) to poll after restart
#                           (default: http://127.0.0.1:3005,http://127.0.0.1:3000)
#   DEPLOY_LOG_DIR          Where deploy logs are written (default: .deploy-logs)
#   MAINTENANCE_FLAG        Flag file nginx watches to serve public/maintenance.html
#                           (default: <repo>/.maintenance)
#   MAINTENANCE_HTML        Maintenance page served by nginx (default: <repo>/public/maintenance.html)

set -Eeuo pipefail

BRANCH="main"
SERVICE="transaction-manager"
ASSUME_YES=false
FORCE=false
SKIP_DB=false
DO_RESTART=true
DO_HEALTHCHECK=true
AUTO_ROLLBACK=true
DO_MAINTENANCE=true
CLEAR_MAINTENANCE=false

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
	--no-maintenance)
		DO_MAINTENANCE=false
		shift
		;;
	--clear-maintenance)
		CLEAR_MAINTENANCE=true
		shift
		;;
	-h | --help)
		awk 'NR>1 && !/^#/ && !/^[[:space:]]*$/ {exit} NR>1 {sub(/^# ?/, ""); print}' "$0"
		exit 0
		;;
	*)
		echo "Unknown option: $1 (see --help)" >&2
		exit 64
		;;
	esac
done

# Detached remote runs (nohup, stdin from /dev/null) have no way to answer prompts.
if [[ ! -t 0 ]]; then
	ASSUME_YES=true
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HEALTH_URLS="${DEPLOY_HEALTH_URL:-http://127.0.0.1:3005,http://127.0.0.1:3000}"
LOG_DIR="${DEPLOY_LOG_DIR:-$APP_DIR/.deploy-logs}"
LOG_FILE="$LOG_DIR/deploy-$(date +%Y%m%d-%H%M%S).log"
LOCK_DIR="/tmp/${SERVICE}.deploy.lock"
PID_FILE="$APP_DIR/deploy.pid"
MAINTENANCE_FLAG="${MAINTENANCE_FLAG:-$APP_DIR/.maintenance}"
MAINTENANCE_HTML="${MAINTENANCE_HTML:-$APP_DIR/public/maintenance.html}"
NGINX_CONF_DIRS="/etc/nginx/sites-enabled /etc/nginx/conf.d"
APP_PROBE_URL="${APP_PROBE_URL:-http://127.0.0.1:3000}"

# Resolved before any sudo elevation (root's PATH lacks ~/.bun/bin).
DEPLOY_USER="${SUDO_USER:-$(id -un)}"
DEPLOY_HOME="$(getent passwd "$DEPLOY_USER" 2>/dev/null | cut -d: -f6 || true)"
DEPLOY_HOME="${DEPLOY_HOME:-${HOME:-}}"
BUN_PATH="${DEPLOY_BUN_PATH:-}"
if [[ -z "$BUN_PATH" ]]; then
	BUN_PATH="${DEPLOY_HOME}/.bun/bin/bun"
	[[ -x "$BUN_PATH" ]] || BUN_PATH="$(command -v bun 2>/dev/null || true)"
fi

# Cache sudo credentials without changing the user running the deployment.
# The elevate helper adds sudo only to commands that actually need root.
check_sudo() {
	if [[ "$(id -u)" -eq 0 ]]; then
		return 0
	fi
	command -v sudo >/dev/null 2>&1 || {
		echo "Need sudo to deploy, but sudo is not installed." >&2
		exit 1
	}
	if sudo -n true 2>/dev/null; then
		return 0
	fi
	if [[ -t 0 ]]; then
		echo "Need sudo to deploy — entering password now..."
		sudo -v || {
			echo "Unable to authenticate with sudo." >&2
			exit 1
		}
		return 0
	fi
	echo "Detached deploy needs passwordless sudo. Grant it with:" >&2
	echo "  echo '$(id -un) ALL=(ALL) NOPASSWD:ALL' | sudo tee /etc/sudoers.d/$(id -un)" >&2
	exit 1
}

STEP=""
PREV_SHA=""
DEPLOYED=false
PID_WRITTEN=false
MAINTENANCE_TOUCHED=false

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m ✓ \033[0m%s\n' "$*"; }
warn() { printf '\033[1;33m ! \033[0m%s\n' "$*"; }
die() {
	printf '\033[1;31m ✗ \033[0m%s\n' "$*" >&2
	[[ -n "${STEP}" ]] && echo "Failed during step: ${STEP}" >&2
	exit 1
}

# --- Maintenance mode -------------------------------------------------------
# nginx watches $MAINTENANCE_FLAG: while it exists every proxied route returns
# 503 and nginx serves $MAINTENANCE_HTML instead. The flag is plain state, so
# toggling never needs an nginx reload.

# True when some nginx site config references the flag file, i.e. maintenance
# mode is actually wired up on this host.
nginx_serves_maintenance() {
	grep -rlsF "$MAINTENANCE_FLAG" $NGINX_CONF_DIRS 2>/dev/null | grep -q .
}

# Cheap liveness probe used when a deploy fails: is anything serving yet?
app_responds() {
	local code
	code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$APP_PROBE_URL" 2>/dev/null || true)
	[[ -n "$code" && "$code" != "000" ]]
}

maintenance_enable() {
	if [[ "$DO_MAINTENANCE" != true ]]; then
		return 0
	fi
	if [[ -e "$MAINTENANCE_FLAG" ]]; then
		warn "Maintenance flag already present (${MAINTENANCE_FLAG}) — leaving it in place."
		return 0
	fi
	if ! nginx_serves_maintenance; then
		warn "nginx is not configured to serve ${MAINTENANCE_HTML} — skipping maintenance mode."
		return 0
	fi
	if [[ ! -f "$MAINTENANCE_HTML" ]]; then
		warn "Maintenance page missing (${MAINTENANCE_HTML}) — skipping maintenance mode."
		return 0
	fi
	: >"$MAINTENANCE_FLAG" 2>/dev/null || {
		warn "Cannot write ${MAINTENANCE_FLAG} — skipping maintenance mode."
		return 0
	}
	MAINTENANCE_TOUCHED=true
	ok "Maintenance page is live (${MAINTENANCE_HTML})"
}

maintenance_disable() {
	[[ "$MAINTENANCE_TOUCHED" == true ]] || return 0
	if rm -f "$MAINTENANCE_FLAG" 2>/dev/null; then
		MAINTENANCE_TOUCHED=false
		ok "Maintenance page removed — the app is back"
	fi
}

# Always emits a machine-readable DEPLOY_SUCCESS/DEPLOY_FAILED marker as the last
# line of output so scripts/deploy-remote.sh can detect the outcome.
cleanup() {
	local code=$?
	if [[ "$PID_WRITTEN" == true ]]; then
		rm -f "$PID_FILE" 2>/dev/null || true
	fi
	rmdir "$LOCK_DIR" 2>/dev/null || true
	if [[ $code -ne 0 && "$DEPLOYED" == true ]]; then
		warn "Deploy finished with errors — service state may be inconsistent."
	fi
	if [[ $code -ne 0 && "$MAINTENANCE_TOUCHED" == true ]]; then
		if app_responds; then
			maintenance_disable
			warn "Deploy failed, but the app still answers on ${APP_PROBE_URL} — taking the site out of maintenance mode."
		else
			echo "The site is still in maintenance mode because nothing is serving on ${APP_PROBE_URL}." >&2
			echo "Bring the app back manually with:  rm -f ${MAINTENANCE_FLAG}" >&2
		fi
	fi
	if [[ $code -eq 0 ]]; then
		echo "DEPLOY_SUCCESS"
	else
		echo "DEPLOY_FAILED"
	fi
}
trap cleanup EXIT

elevate() {
	if [ "$(id -u)" -eq 0 ]; then
		"$@"
	elif command -v sudo >/dev/null 2>&1; then
		if [[ -t 0 ]]; then
			sudo -v # refresh the sudo timestamp window so long steps don't re-prompt
		fi
		sudo "$@"
	else
		die "Need root or sudo to run: $*"
	fi
}

check_database() {
	local raw host="" port="5432"
	raw="$(grep -E '^[[:space:]]*(export[[:space:]]+)?DATABASE_URL=' "$APP_DIR/.env" | tail -n 1 || true)"
	[[ -n "$raw" ]] || die "DATABASE_URL not found in .env — copy .env.example and configure the database first."
	raw="${raw#*=}"
	raw="${raw%%[[:space:]]*#*}"
	raw="${raw%\"}"
	raw="${raw#\"}"
	raw="${raw%\'}"
	raw="${raw#\'}"
	[[ "$raw" =~ ^postgres(ql)?://[^[:space:]]+$ ]] ||
		die "DATABASE_URL in .env is not a valid PostgreSQL URL (expected postgresql://user:pass@host:port/db)."
	if [[ "$raw" =~ @(\[[^]]+\]|[^:/@]+)(:([0-9]+))?(/|$) ]]; then
		host="${BASH_REMATCH[1]}"
		host="${host//[][]/}"
		port="${BASH_REMATCH[3]:-5432}"
	fi
	[[ -n "$host" ]] || die "Could not extract the database host from DATABASE_URL in .env."

	log "Checking database connectivity at ${host}:${port}"
	if command -v psql >/dev/null 2>&1; then
		if PGCONNECT_TIMEOUT=5 psql "$raw" -tAc 'SELECT 1;' >/dev/null 2>&1; then
			ok "Database connection verified (${host}:${port})"
		else
			die "Cannot connect to PostgreSQL at ${host}:${port} with credentials from .env. Check DATABASE_URL; is PostgreSQL installed and running? Try: sudo systemctl status postgresql"
		fi
	else
		warn "psql not found — skipping database connectivity check. Install postgresql-client to enable pre-deploy verification."
	fi
}

ensure_service() {
	command -v systemctl >/dev/null 2>&1 || {
		warn "systemctl not available — skipping systemd unit setup."
		return 0
	}

	if systemctl cat "$SERVICE" >/dev/null 2>&1; then
		return 0
	fi

	local unit_file="/etc/systemd/system/${SERVICE}.service"
	log "Creating systemd unit ${unit_file}"
	local group tmp
	group="$(id -gn "$DEPLOY_USER" 2>/dev/null || true)"
	group="${group:-$DEPLOY_USER}"
	tmp="$(mktemp)"
	cat >"$tmp" <<EOF
[Unit]
Description=Transaction Manager Application Service
After=network.target

[Service]
Type=simple
User=${DEPLOY_USER}
Group=${group}
WorkingDirectory=${APP_DIR}

# Environment settings (uncomment/add if needed)
# Environment=NODE_ENV=production
# Environment=PORT=3000

# ExecStart points directly to your Bun binary and start command
ExecStart=${BUN_PATH} run start

# Automatic restart policy
Restart=always
RestartSec=5

# Logging handling
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
	elevate install -m 644 "$tmp" "$unit_file"
	rm -f "$tmp"
	elevate systemctl daemon-reload
	elevate systemctl enable "$SERVICE" >/dev/null
	ok "Created and enabled ${SERVICE}.service (WorkingDirectory=${APP_DIR}, User=${DEPLOY_USER})"
}

# --clear-maintenance is a standalone recovery action: no sudo, no lock, so it
# always works even when a deploy is stuck.
if [[ "$CLEAR_MAINTENANCE" == true ]]; then
	log "Clearing maintenance mode"
	if [[ -e "$MAINTENANCE_FLAG" ]]; then
		rm -f "$MAINTENANCE_FLAG"
		ok "Removed ${MAINTENANCE_FLAG} — the app is reachable again"
	else
		ok "No maintenance flag present (${MAINTENANCE_FLAG}) — nothing to do"
	fi
	exit 0
fi

check_sudo

mkdir "$LOCK_DIR" 2>/dev/null || die "Another deploy of '${SERVICE}' appears to be running (${LOCK_DIR})."

# Advertise the running deploy so scripts/deploy-remote.sh can attach its log tail.
echo $$ >"$PID_FILE"
PID_WRITTEN=true

cd "$APP_DIR"

log "Preflight checks"
[[ -d .git ]] || die "$APP_DIR is not a git repository."
[[ -f .env ]] || die ".env not found — copy .env.example and configure secrets first."
command -v git >/dev/null || die "git is not installed."
[[ -x "$BUN_PATH" ]] || die "bun is not installed or not executable at '${BUN_PATH:-unknown}'."

if [[ "$SKIP_DB" != true ]]; then
	check_database
fi

git fetch origin "$BRANCH" >/dev/null 2>&1 || die "Cannot fetch origin/${BRANCH}. Check network and remotes."
git rev-parse --verify --quiet "origin/${BRANCH}" >/dev/null || die "Branch origin/${BRANCH} does not exist."

ensure_service

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

	# Everything below (install, prisma, build) rewrites node_modules/.next
	# underneath the running server, so take the site down first.
	STEP="enabling maintenance mode"
	maintenance_enable

	STEP="installing dependencies"
	log "Installing dependencies (bun)"
	NODE_ENV=production "$BUN_PATH" install --frozen-lockfile >/dev/null
	ok "Dependencies installed"

	if [[ "$SKIP_DB" != true ]]; then
		STEP="syncing database schema"
		log "Generating Prisma client"
		"$BUN_PATH" x --bun prisma generate >/dev/null
		log "Pushing schema to database (prompts on destructive changes)"
		"$BUN_PATH" x --bun prisma db push
		ok "Database schema in sync"
	fi

	STEP="building"
	log "Building application"
	NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production "$BUN_PATH" run build >"$LOG_DIR/build-$(date +%Y%m%d-%H%M%S).log" 2>&1 ||
		die "Build failed — see $LOG_DIR. Old process is still running."
	ok "Build succeeded"
}

restart_service() {
	STEP="restarting ${SERVICE}"
	log "Restarting ${SERVICE}"
	elevate systemctl restart "$SERVICE"
	ok "Service restarted"
}

health_check() {
	STEP="health check"
	local -a urls
	IFS=',' read -r -a urls <<<"$HEALTH_URLS"
	log "Waiting for ${urls[*]} to become healthy"
	local attempts=30 status="" url
	for ((i = 1; i <= attempts; i++)); do
		for url in "${urls[@]}"; do
			status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url" || true)
			if [[ "$status" =~ ^[23] ]] || [[ "$status" == "401" ]] || [[ "$status" == "404" ]]; then
				ok "Healthy (${url} HTTP ${status}) after attempt ${i}/${attempts}"
				return 0
			fi
		done
		sleep 2
	done
	warn "Health check failed after ${attempts} attempts (last status: ${status:-none})"
	return 1
}

rollback() {
	warn "Rolling back to previous commit ${PREV_SHA}"
	git reset --hard "$PREV_SHA" >/dev/null || die "Cannot reset to ${PREV_SHA}."
	NODE_ENV=production "$BUN_PATH" install --frozen-lockfile >/dev/null 2>&1 || true
	"$BUN_PATH" x --bun prisma generate >/dev/null 2>&1 || true
	NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production "$BUN_PATH" run build >"$LOG_DIR/rollback-build.log" 2>&1 ||
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
	# Only bring the app back once it actually answers again.
	maintenance_disable
else
	log "Skipping restart (--no-restart). Run manually:"
	echo "  sudo systemctl restart ${SERVICE}"
fi

NEW_SHA="$(git rev-parse --short HEAD)"
{
	echo "$(date '+%F %T') branch=${BRANCH} ${PREV_SHA} -> ${NEW_SHA} by=${USER:-unknown} host=$(hostname)"
} >>"$APP_DIR/.deploy-history.log"

echo ""
log "========================================="
log "  Deployment Complete!"
log "========================================="
log ""
log "Service status:"
elevate systemctl status "$SERVICE" --no-pager || true
log ""
log "Logs: journalctl -u ${SERVICE} -f"
