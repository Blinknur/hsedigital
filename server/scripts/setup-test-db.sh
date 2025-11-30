#!/bin/bash

set -e

echo "🔧 Setting up test database and services..."

DB_USER=${DB_USER:-hse_admin}
DB_PASSWORD=${DB_PASSWORD:-dev_password_123}
DB_NAME=${DB_NAME:-hse_platform}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

echo "📦 Starting PostgreSQL..."
if command -v brew &> /dev/null; then
    brew services start postgresql@14 || brew services restart postgresql@14
elif command -v systemctl &> /dev/null; then
    sudo systemctl start postgresql
else
    echo "⚠️  Please start PostgreSQL manually"
fi

sleep 2

echo "📦 Starting Redis..."
if command -v brew &> /dev/null; then
    brew services start redis || brew services restart redis
elif command -v systemctl &> /dev/null; then
    sudo systemctl start redis
else
    echo "⚠️  Please start Redis manually"
fi

sleep 2

echo "🗄️  Creating database if not exists..."
createdb -h $DB_HOST -U $DB_USER -p $DB_PORT $DB_NAME 2>/dev/null || echo "Database already exists"

echo "🔄 Running Prisma migrations..."
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
npx prisma generate
npx prisma db push --skip-generate

echo "✅ Test database setup complete!"
echo ""
echo "📝 Database URL: $DATABASE_URL"
echo "📝 Redis: redis://localhost:6379"
echo ""
echo "🚀 You can now run tests with: npm run test:integration"
