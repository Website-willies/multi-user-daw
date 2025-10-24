#!/bin/bash
set -e

cd "$(dirname "$0")/.."

set -a
source .env
set +a

DBNAME="multi_user_daw"
if ! psql -lqt | cut -d \| -f 1 | grep -qw $DBNAME; then
  echo "Creating database $DBNAME..."
  createdb $DBNAME
else
  echo "Database $DBNAME already exists."
fi

echo "Running migrations..."
npx node-pg-migrate up