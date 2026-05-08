#!/bin/bash
set -e
echo "=== Deploy RiqFy ==="
git pull origin main
npm install --production
pm2 restart riqfy || pm2 start ecosystem.config.js
pm2 save
echo "=== Deploy concluído ==="
