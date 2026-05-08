# Deploy RiqFy na Hostinger VPS

## Passo 1 — Acessar o VPS
```bash
ssh root@SEU_IP
```

## Passo 2 — Rodar setup inicial (apenas uma vez)
```bash
bash setup-vps.sh
```

## Passo 3 — Upload do projeto

**Opção A: via Git**
```bash
cd /var/www
git clone SEU_REPOSITORIO riqfy
cd riqfy
```

**Opção B: via SFTP (FileZilla)**
Enviar todos os arquivos para `/var/www/riqfy`

## Passo 4 — Instalar dependências
```bash
cd /var/www/riqfy
npm install --production
```

## Passo 5 — Configurar variáveis de ambiente
```bash
cp .env.example .env
nano .env
# Editar JWT_SECRET e MASTER_PASSWORD com chaves fortes
```

## Passo 6 — Configurar Nginx
```bash
cp nginx.conf /etc/nginx/sites-available/riqfy
ln -s /etc/nginx/sites-available/riqfy /etc/nginx/sites-enabled/
# Editar o server_name no arquivo:
nano /etc/nginx/sites-available/riqfy
nginx -t
systemctl restart nginx
```

## Passo 7 — Iniciar o servidor
```bash
pm2 start ecosystem.config.js
pm2 save
```

## Passo 8 — SSL gratuito (HTTPS)
```bash
certbot --nginx -d SEU_DOMINIO.com -d www.SEU_DOMINIO.com
```

## Passo 9 — Verificar
```bash
pm2 status
pm2 logs riqfy
```

## Atualizar o sistema (próximas vezes)
```bash
cd /var/www/riqfy && bash deploy.sh
```

---

## Referência rápida PM2
| Comando | Ação |
|---|---|
| `pm2 status` | Ver processos |
| `pm2 logs riqfy` | Ver logs em tempo real |
| `pm2 restart riqfy` | Reiniciar app |
| `pm2 stop riqfy` | Parar app |
| `pm2 monit` | Monitor interativo |

## Portas e firewall
```bash
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```
