#!/bin/bash

# Launch UTJN Website in Docker Container (Production Mode)
echo "🚀 Launching UTJN Website in Docker Container (Production Mode)..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install it first."
    exit 1
fi

# Check if env file exists
if [ ! -f "env" ]; then
    echo "❌ env file not found. Please make sure the env file exists."
    exit 1
fi

echo "📋 Current environment configuration:"
echo "   - Frontend: https://uoftjn.com (via Caddy)"
echo "   - Backend API: https://uoftjn.com/api"
echo "   - Database: PostgreSQL (AWS RDS)"
echo "   - Reverse Proxy: Caddy"

echo ""
echo "⚠️  IMPORTANT: Before launching, please ensure:"
echo "   - AWS credentials are configured (EC2 role or environment variables)"
echo "   - Database URL is set in environment"
echo "   - Domain uoftjn.com is pointing to this server"
echo ""

read -p "Are you ready to launch? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please check your configuration first and run this script again."
    exit 1
fi

echo "🔧 Building and starting containers..."
docker-compose up --build -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 30

echo ""
echo "📊 Checking service status..."
docker-compose ps

echo ""
echo "🌐 Website should be available at:"
echo "   - Production: https://uoftjn.com"
echo "   - Health Check: https://uoftjn.com/ping"
echo ""

echo "📝 Useful commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - View specific service logs: docker-compose logs -f [service_name]"
echo "   - Stop services: docker-compose down"
echo "   - Restart services: docker-compose restart"
echo "   - Rebuild and restart: docker-compose up --build -d"
echo ""

echo "✅ Launch complete! The website should be running in production mode." 