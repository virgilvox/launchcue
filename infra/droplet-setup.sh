#!/usr/bin/env bash
# ─── Supabase Droplet Setup ───
# Sets up a self-hosted Supabase stack on a DigitalOcean Droplet.
# Requirements: 4GB+ RAM Droplet, Ubuntu 22.04+
#
# Usage:
#   1. Create a Droplet (4GB+ RAM) via DO console
#   2. SSH in and run this script
#   3. Configure .env with strong passwords
#   4. Run: docker compose up -d
#   5. Apply migrations: psql < sql/migrations/*.sql

set -euo pipefail

echo "=== Installing Docker ==="
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

echo "=== Installing Docker Compose ==="
apt-get install -y docker-compose-plugin

echo "=== Creating app directory ==="
mkdir -p /opt/launchcue
cd /opt/launchcue

echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Copy docker-compose.yml, supabase/ directory, and .env to /opt/launchcue/"
echo "  2. Edit .env with strong passwords:"
echo "     - POSTGRES_PASSWORD (random 32+ chars)"
echo "     - JWT_SECRET (random 32+ chars)"
echo "     - SECRET_KEY_BASE (random 64+ chars)"
echo "     - Generate SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY JWTs"
echo "  3. Start the stack: docker compose up -d"
echo "  4. Apply SQL migrations"
echo "  5. Configure firewall:"
echo "     ufw allow 22/tcp"
echo "     ufw allow from <APP_PLATFORM_VPC_CIDR> to any port 8000"
echo "     ufw enable"
echo ""
echo "  Optional: Set up nginx + Let's Encrypt for TLS"
echo "     apt install nginx certbot python3-certbot-nginx"
echo "     certbot --nginx -d supabase.yourdomain.com"
