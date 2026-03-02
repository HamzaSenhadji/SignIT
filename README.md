# Signadji

Application web de signature et d'édition de PDFs.
Stack : Vanilla JS + Python (http.server) — aucune dépendance NPM, aucun build.

---

## Déploiement sur une VM Linux (depuis zéro)

### 1. Cloner le projet

```bash
git clone https://github.com/HamzaSenhadji/Signadji.git /home/adminvm/Signadji-main
cd /home/adminvm/Signadji-main
```

### 2. Générer le certificat HTTPS auto-signé

```bash
openssl req -x509 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem \
  -days 365 -nodes \
  -subj "/CN=signature.ardenne-metropole.fr"
```

> Sans `cert.pem` / `key.pem`, le serveur démarre en HTTP sur le port 8080.

### 3. Créer le service systemd

```bash
printf '[Unit]\nDescription=Signadji PDF Server\nAfter=network.target\n\n[Service]\nUser=adminvm\nWorkingDirectory=/home/adminvm/Signadji-main\nExecStart=/usr/bin/python3 server.py\nRestart=always\nRestartSec=3\nStandardOutput=journal\nStandardError=journal\n\n[Install]\nWantedBy=multi-user.target\n' | sudo tee /etc/systemd/system/signadji.service

sudo systemctl daemon-reload
sudo systemctl enable signadji
sudo systemctl start signadji
```

### 4. Rediriger les ports

```bash
# HTTP  80  → 8080
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8080

# HTTPS 443 → 8443
sudo iptables -t nat -A PREROUTING -p tcp --dport 443 -j REDIRECT --to-port 8443

# Sauvegarder les règles
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

### 5. Accès aux PDFs réseau (optionnel)

Le serveur lit les PDFs depuis le partage `\\vmstockage\AGGLO$`.
Requiert que la VM ait accès au port 445 de `vmstockage` (à demander à l'admin réseau).

```bash
sudo mkdir -p /mnt/agglo
sudo mount -t cifs //vmstockage/AGGLO$ /mnt/agglo \
  -o username=UTILISATEUR,password=MOT_DE_PASSE,domain=AMCMZ,uid=adminvm,gid=adminvm

# Puis démarrer le service avec le bon chemin
sudo systemctl set-environment PDF_ROOT=/mnt/agglo/DSI/_COMMUN/02_EXPLOITATION/20_AFFECTATION_MATERIEL/PDF
sudo systemctl restart signadji
```

---

## Commandes utiles

```bash
sudo systemctl status signadji      # état du service
sudo systemctl restart signadji     # redémarrer
journalctl -u signadji -f           # logs en direct
```

---

## URLs

| URL | Description |
|-----|-------------|
| `https://signature.ardenne-metropole.fr` | Application principale |
| `https://signature.ardenne-metropole.fr/explorer` | Explorateur de fichiers PDF |
| `https://signature.ardenne-metropole.fr/api/files` | Liste des PDFs (JSON) |

---

## Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `PDF_ROOT` | `/mnt/pdfs` | Chemin vers le dossier des PDFs |
