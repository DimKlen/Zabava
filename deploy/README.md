# Déploiement de l'API

Un seul serveur Linux (Oracle Cloud Always Free, VM `VM.Standard.E2.1.Micro` : x86_64, 1 Go de RAM + 2 Go de swap, Ubuntu 24.04) fait tourner deux conteneurs :

- `api` : l'image de `backend/Dockerfile`, construite sur le serveur (environ 10 min grâce au swap ; l'envoi d'une image toute faite depuis le PC est trop lent, ~26 Ko/s vers Oracle) ;
- `caddy` : le proxy HTTPS, qui obtient seul un certificat Let's Encrypt pour `API_DOMAIN`.

Pas de nom de domaine à acheter : `API_DOMAIN` peut être `<ip-avec-tirets>.sslip.io` (ex. `140-238-1-2.sslip.io`), qui pointe vers l'IP publique.

## Prérequis du serveur

- VCN avec Internet Gateway, route `0.0.0.0/0` vers elle, sous-réseau public.
- Ports 22, 80 et 443 ouverts dans la Security List du VCN **et** dans le pare-feu de la VM (les images Ubuntu d'Oracle bloquent tout par `iptables`, sauf SSH) :
  `sudo iptables -I INPUT 5 -m state --state NEW -p tcp --dport 80 -j ACCEPT` (idem 443), puis `sudo netfilter-persistent save`.
- Swap de 2 Go (`/swapfile`, dans `/etc/fstab`).
- Docker et le plugin Compose (`curl -fsSL https://get.docker.com | sudo sh`).

## Variables (`deploy/.env` sur le serveur, jamais commité)

| Variable | Rôle |
|---|---|
| `API_DOMAIN` | Nom servi par Caddy (ex. `140-238-1-2.sslip.io`) |
| `DATABASE_URL` | `jdbc:postgresql://aws-1-ca-central-1.pooler.supabase.com:5432/postgres` |
| `DATABASE_USER` | `postgres.yavjdvphnsnpgchfjpah` |
| `DATABASE_PASSWORD` | Mot de passe de la base |
| `SUPABASE_URL` | `https://yavjdvphnsnpgchfjpah.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète (suppression de compte) |
| `TMDB_API_KEY` | Clé TMDB |
| `OMDB_API_KEY` | Clé OMDb (facultative : notes IMDb) |
| `EXPO_ACCESS_TOKEN` | Jeton Expo (facultatif : push sécurisé) |

## Mise à jour

Depuis la racine du dépôt, sur le PC (Git Bash) :

```sh
(cd backend && git archive --format=tar HEAD src gradle gradlew settings.gradle.kts build.gradle.kts Dockerfile .dockerignore) \
  | ssh -i ~/.ssh/zabava_oracle ubuntu@<ip> "rm -rf ~/zabava/backend && mkdir -p ~/zabava/backend && tar xf - -C ~/zabava/backend"
for f in compose.yml Caddyfile; do ssh -i ~/.ssh/zabava_oracle ubuntu@<ip> "cat > ~/zabava/deploy/$f" < deploy/$f; done
ssh -i ~/.ssh/zabava_oracle ubuntu@<ip> "cd ~/zabava/deploy && sudo docker compose up -d --build"
```

`scp` échoue sur cette VM (« Connection closed ») : les fichiers passent par `ssh … cat`.

Vérification : `https://<API_DOMAIN>/actuator/health` répond `{"status":"UP"}`.
