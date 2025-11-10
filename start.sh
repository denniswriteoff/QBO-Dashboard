#!/bin/bash

# QBO Dashboard Startup Script

echo "🚀 Starting QBO Dashboard..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate
echo ""

# Start the development server
echo "✅ Starting development server on http://localhost:3002..."
echo ""
npm run dev

