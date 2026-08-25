# Fix: brew services PostgreSQL not working (`error` status)

## Symptom

```sh
brew services list
```

```
Name           Status  User     File
postgresql@18  error   muntdher ~/Library/LaunchAgents/homebrew.mxcl.postgresql@18.plist
```

Log keeps repeating:

```
FATAL:  lock file "postmaster.pid" already exists
HINT:   Is another postmaster (PID 865) running in data directory "/opt/homebrew/var/postgresql@18"?
```

## Cause

Postgres crashed or was killed uncleanly, leaving a stale `postmaster.pid` lock file behind.
The PID inside it may even be reused by another macOS process, so every restart attempt fails.

## Fix

### 1. Stop the service

```sh
brew services stop postgresql@18
```

### 2. Verify the PID in the lock file is NOT postgres

```sh
cat /opt/homebrew/var/postgresql@18/postmaster.pid
ps -p <PID>
```

If the process is anything other than `postgres` (e.g. a macOS system process), the file is stale and safe to delete.

> If a real `postgres` process IS running, kill it first:
> ```sh
> kill <PID>          # graceful
> # only if stuck:
> kill -9 <PID>
> ```

### 3. Remove the stale lock file

```sh
rm /opt/homebrew/var/postgresql@18/postmaster.pid
```

### 4. Start the service again

```sh
brew services start postgresql@18
```

### 5. Verify

```sh
brew services list | grep postgres
/opt/homebrew/opt/postgresql@18/bin/pg_isready
# /tmp:5432 - accepting connections
```

## One-liner (stale lock, no real postgres running)

```sh
brew services stop postgresql@18 && rm /opt/homebrew/var/postgresql@18/postmaster.pid && brew services start postgresql@18
```

## Useful commands

| Command | Purpose |
|---|---|
| `brew services list` | Show service status |
| `tail -50 /opt/homebrew/var/log/postgresql@18.log` | Check logs |
| `/opt/homebrew/opt/postgresql@18/bin/pg_ctl -D /opt/homebrew/var/postgresql@18 status` | Check server status directly |
| `psql postgresql://localhost:5432/postgres` | Test connection |

> Adjust `postgresql@18` to your version (`postgresql@17`, etc.). For Intel Macs use `/usr/local/` instead of `/opt/homebrew/`.
