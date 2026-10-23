#!/bin/bash

#######################################
# AstraLink VPS Setup Script
# Initial server configuration
#######################################

set -e

echo "🚀 AstraLink VPS Setup"
echo "======================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root (use sudo)"
  exit 1
fi

# Configuration
DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR="/opt/astralink"
DOMAIN="${DOMAIN:-}"

echo ""
echo "Configuration:"
echo "  Deploy User: $DEPLOY_USER"
echo "  App Directory: $APP_DIR"
echo "  Domain: $DOMAIN"
echo ""

read -p "Continue with setup? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  exit 1
fi

# Update system
echo ""
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install required packages
echo ""
echo "📦 Installing required packages..."
apt-get install -y \
  curl \
  git \
  ufw \
  fail2ban \
  certbot \
  python3-certbot-nginx \
  apt-transport-https \
  ca-certificates \
  gnupg \
  lsb-release

# Install Docker
echo ""
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm get-docker.sh

  # Enable Docker service
  systemctl enable docker
  systemctl start docker

  echo "✅ Docker installed"
else
  echo "✅ Docker already installed"
fi

# Install Docker Compose
echo ""
echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
  DOCKER_COMPOSE_VERSION="v2.24.0"
  curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
  echo "✅ Docker Compose installed"
else
  echo "✅ Docker Compose already installed"
fi

# Create deployment user
echo ""
echo "👤 Creating deployment user..."
if id "$DEPLOY_USER" &>/dev/null; then
  echo "✅ User $DEPLOY_USER already exists"
else
  useradd -m -s /bin/bash "$DEPLOY_USER"
  usermod -aG docker "$DEPLOY_USER"
  echo "✅ User $DEPLOY_USER created and added to docker group"
fi

# Setup SSH key for deployment user
echo ""
echo "🔑 Setting up SSH for $DEPLOY_USER..."
mkdir -p /home/$DEPLOY_USER/.ssh
chmod 700 /home/$DEPLOY_USER/.ssh

if [ ! -f /home/$DEPLOY_USER/.ssh/authorized_keys ]; then
  touch /home/$DEPLOY_USER/.ssh/authorized_keys
  chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
  chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
  echo "✅ SSH directory created"
  echo ""
  echo "⚠️  IMPORTANT: Add your SSH public key to /home/$DEPLOY_USER/.ssh/authorized_keys"
  echo "   Example: echo 'ssh-rsa AAAA...' >> /home/$DEPLOY_USER/.ssh/authorized_keys"
fi

# Setup firewall
echo ""
echo "🔥 Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable
echo "✅ Firewall configured"

# Setup fail2ban
echo ""
echo "🛡️  Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban
echo "✅ Fail2ban configured"

# Create application directory
echo ""
echo "📁 Creating application directory..."
mkdir -p "$APP_DIR"
chown $DEPLOY_USER:$DEPLOY_USER "$APP_DIR"
echo "✅ Application directory created: $APP_DIR"

# Clone repository
echo ""
echo "📥 Setting up git repository..."
if [ ! -d "$APP_DIR/.git" ]; then
  read -p "Enter repository URL: " REPO_URL
  sudo -u $DEPLOY_USER git clone "$REPO_URL" "$APP_DIR"
  echo "✅ Repository cloned"
else
  echo "✅ Repository already exists"
fi

# Setup SSL with Let's Encrypt
if [ -n "$DOMAIN" ]; then
  echo ""
  echo "🔒 Setting up SSL certificate for $DOMAIN..."

  # Stop any services using port 80
  docker-compose -f "$APP_DIR/docker-compose.yml" down 2>/dev/null || true

  # Request certificate
  certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "admin@$DOMAIN" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

  # Setup auto-renewal
  systemctl enable certbot.timer
  echo "✅ SSL certificate obtained"
else
  echo "⚠️  Skipping SSL setup (no domain specified)"
fi

# Setup log rotation
echo ""
echo "📝 Configuring log rotation..."
cat > /etc/logrotate.d/astralink << EOF
/opt/astralink/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $DEPLOY_USER $DEPLOY_USER
    sharedscripts
    postrotate
        docker-compose -f /opt/astralink/docker-compose.yml restart backend 2>/dev/null || true
    endscript
}
EOF
echo "✅ Log rotation configured"

# Create .env template
echo ""
echo "📄 Creating .env template..."
cat > "$APP_DIR/.env.example" << 'EOF'
# Database
POSTGRES_DB=astralink
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD
POSTGRES_PORT=5432

# Redis
REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD
REDIS_URL=redis://:CHANGE_ME_REDIS_PASSWORD@redis:6379

# Backend
NODE_ENV=production
BACKEND_PORT=3000
JWT_SECRET=CHANGE_ME_JWT_SECRET_AT_LEAST_32_CHARS

# AI Providers (optional)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
DEEPSEEK_API_KEY=

# Upload/Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# CORS
FRONTEND_URL=https://your-domain.com

# Domain for SSL
DOMAIN=your-domain.com
SSL_EMAIL=admin@your-domain.com
EOF

chown $DEPLOY_USER:$DEPLOY_USER "$APP_DIR/.env.example"
echo "✅ .env template created at $APP_DIR/.env.example"

# Setup systemd service for auto-start
echo ""
echo "⚙️  Setting up systemd service..."
cat > /etc/systemd/system/astralink.service << EOF
[Unit]
Description=AstraLink Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
User=$DEPLOY_USER
Group=$DEPLOY_USER
ExecStart=/usr/local/bin/docker-compose --profile production up -d
ExecStop=/usr/local/bin/docker-compose down
ExecReload=/usr/local/bin/docker-compose restart

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable astralink.service
echo "✅ Systemd service configured"

# Final instructions
echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit the .env file: cp $APP_DIR/.env.example $APP_DIR/.env && nano $APP_DIR/.env"
echo "2. Add your SSH public key to /home/$DEPLOY_USER/.ssh/authorized_keys"
echo "3. Update nginx configuration with your domain in $APP_DIR/nginx/conf.d/astralink.conf"
echo "4. Build and start the application: cd $APP_DIR && docker-compose --profile production up -d"
echo "5. Run database migrations: docker-compose exec backend npx prisma migrate deploy"
echo ""
echo "GitHub Actions Secrets to configure:"
echo "  - VPS_HOST: $(hostname -I | awk '{print $1}')"
echo "  - VPS_USER: $DEPLOY_USER"
echo "  - VPS_SSH_KEY: (your private SSH key)"
echo "  - DOMAIN: $DOMAIN"
echo "  - ENV_FILE: (contents of your .env file)"
echo ""
