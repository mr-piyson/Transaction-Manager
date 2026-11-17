#!/bin/zsh

echo "===== STOPPING POSTGRESQL ====="

brew services stop postgresql@18 2>&1 | tail -3

echo ""
echo "===== REMOVING STALE FILES ====="

rm -f \
  /opt/homebrew/var/postgresql@18/postmaster.pid \
  /tmp/.s.PGSQL.5432 \
  /tmp/.s.PGSQL.5432.lock

echo "Stale files removed"

echo ""
echo "===== STARTING POSTGRESQL ====="

brew services start postgresql@18 2>&1 | tail -5

echo ""
echo "===== WAITING FOR POSTGRESQL ====="

sleep 3

echo ""
echo "===== POSTGRESQL SERVICE STATUS ====="

brew services list | grep postgres

echo ""
echo "===== DONE ====="
