#!/bin/bash
set -e

# Atualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Instalar PM2 globalmente
npm install -g pm2

# Instalar Nginx
apt install -y nginx

# Instalar Certbot para SSL grátis
apt install -y certbot python3-certbot-nginx

# Criar pasta do projeto
mkdir -p /var/www/riqfy
mkdir -p /var/www/riqfy/logs

# Configurar PM2 para iniciar no boot
pm2 startup systemd

echo "=== VPS pronto! Agora faça upload do projeto ==="
