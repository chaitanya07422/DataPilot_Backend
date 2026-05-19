#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting DataPilot API..."
exec node dist/server.js
