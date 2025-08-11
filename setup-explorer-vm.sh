#!/bin/bash
set -e

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Configurazione
export DEBIAN_FRONTEND=noninteractive

log "=== SETUP IPERCHAIN BLOCK EXPLORER VM ==="
log "Aggiornamento sistema..."
sudo apt update && sudo apt upgrade -y

log "Installazione dipendenze base..."
sudo apt install -y curl wget git ufw nginx certbot python3-certbot-nginx

# Installazione Node.js 20
log "Installazione Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifica installazione
log "Versioni installate:"
node --version
npm --version

# Configurazione firewall
log "Configurazione firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000

# Creazione utente per l'app (opzionale)
log "Configurazione directory applicazione..."
sudo mkdir -p /opt/iperchain-explorer
sudo chown -R $USER:$USER /opt/iperchain-explorer

# Configurazione Nginx
log "Configurazione Nginx..."
sudo tee /etc/nginx/sites-available/iperchain-explorer > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Abilita il sito
sudo ln -sf /etc/nginx/sites-available/iperchain-explorer /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Creazione script di gestione
log "Creazione script di gestione..."

# Script start
sudo tee /usr/local/bin/start-explorer.sh > /dev/null << 'EOF'
#!/bin/bash
cd /opt/iperchain-explorer
if [ -f "package.json" ]; then
    echo "Avvio Iperchain Explorer..."
    npm run build
    nohup npm start > /var/log/iperchain-explorer.log 2>&1 &
    echo $! > /var/run/iperchain-explorer.pid
    echo "Explorer avviato con PID $(cat /var/run/iperchain-explorer.pid)"
else
    echo "Errore: package.json non trovato in /opt/iperchain-explorer"
    exit 1
fi
EOF

# Script stop
sudo tee /usr/local/bin/stop-explorer.sh > /dev/null << 'EOF'
#!/bin/bash
if [ -f /var/run/iperchain-explorer.pid ]; then
    PID=$(cat /var/run/iperchain-explorer.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "Arresto Explorer (PID: $PID)..."
        kill $PID
        rm -f /var/run/iperchain-explorer.pid
        echo "Explorer arrestato"
    else
        echo "Explorer non in esecuzione"
        rm -f /var/run/iperchain-explorer.pid
    fi
else
    echo "File PID non trovato, arresto tramite pkill..."
    pkill -f "next start" || echo "Nessun processo da arrestare"
fi
EOF

# Script status
sudo tee /usr/local/bin/status-explorer.sh > /dev/null << 'EOF'
#!/bin/bash
if [ -f /var/run/iperchain-explorer.pid ]; then
    PID=$(cat /var/run/iperchain-explorer.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "Explorer è in esecuzione (PID: $PID)"
        echo "Log: tail -f /var/log/iperchain-explorer.log"
    else
        echo "Explorer non in esecuzione (PID file stale)"
        rm -f /var/run/iperchain-explorer.pid
    fi
else
    echo "Explorer non in esecuzione"
fi
EOF

# Rendi eseguibili gli script
sudo chmod +x /usr/local/bin/start-explorer.sh
sudo chmod +x /usr/local/bin/stop-explorer.sh  
sudo chmod +x /usr/local/bin/status-explorer.sh

# Creazione servizio systemd
log "Creazione servizio systemd..."
sudo tee /etc/systemd/system/iperchain-explorer.service > /dev/null << 'EOF'
[Unit]
Description=Iperchain Block Explorer
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/iperchain-explorer
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal
SyslogIdentifier=iperchain-explorer

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable iperchain-explorer

log "=== SETUP COMPLETATO ==="
log "VM pronta per ricevere il codice del block explorer"
log ""
log "Prossimi passi:"
log "1. Copia il codice: scp -r ./iperchain-explorer/* user@IP:/opt/iperchain-explorer/"
log "2. Installa dipendenze: ssh user@IP 'cd /opt/iperchain-explorer && npm install'"
log "3. Avvia servizio: ssh user@IP 'sudo systemctl start iperchain-explorer'"
log ""
log "Script di gestione disponibili:"
log "- start-explorer.sh"
log "- stop-explorer.sh"
log "- status-explorer.sh"