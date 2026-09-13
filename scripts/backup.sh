#!/bin/bash
set -e

BACKUP_DIR=".backup"

echo "🔄 Starting backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Parse DATABASE_URL
if [ -f .env ]; then
  DATABASE_URL=$(grep -E '^DATABASE_URL=' .env | cut -d '=' -f2- | tr -d '"')
else
  echo "❌ .env file not found"
  exit 1
fi

# Detect database type from URL
if echo "$DATABASE_URL" | grep -qE '^mysql(2)?://'; then
  DB_TYPE="mysql"
elif echo "$DATABASE_URL" | grep -qE '^postgresql(ql)?://'; then
  DB_TYPE="postgresql"
else
  echo "❌ Unsupported database type in DATABASE_URL"
  exit 1
fi

# Extract connection details from DATABASE_URL
# Format: protocol://user:password@host:port/database
USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
PASSWORD=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DATABASE=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

# Backup database
echo "📦 Dumping database: $DATABASE ($DB_TYPE)"

if [ "$DB_TYPE" = "postgresql" ]; then
  PGPASSWORD="$PASSWORD" pg_dump -h "$HOST" -p "$PORT" -U "$USER" -d "$DATABASE" -F plain -f "$BACKUP_DIR/database.sql"
elif [ "$DB_TYPE" = "mysql" ]; then
  mysqldump -h "$HOST" -P "$PORT" -u "$USER" -p"$PASSWORD" "$DATABASE" > "$BACKUP_DIR/database.sql"
fi

# Backup .data/uploads
if [ -d ".data/uploads" ]; then
  echo "📁 Copying .data/uploads..."
  rm -rf "$BACKUP_DIR/uploads"
  cp -r ".data/uploads" "$BACKUP_DIR/uploads"
else
  echo "⚠️  .data/uploads not found, skipping"
fi

# Backup .env
echo "⚙️  Copying .env..."
cp .env "$BACKUP_DIR/.env"

# Get backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

echo "✅ Backup completed: $BACKUP_DIR/ ($BACKUP_SIZE)"
echo "   - database.sql"
echo "   - uploads/"
echo "   - .env"
