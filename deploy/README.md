# Déploiement de l'API

Un seul serveur Linux (Oracle Cloud Always Free, VM Ampere arm64, Ubuntu) fait tourner deux conteneurs :

- `api` : l'image de `backend/Dockerfile`, construite sur le serveur ;
- `caddy` : le proxy HTTPS, qui obtient seul un certificat Let's Encrypt pour `API_DOMAIN`.

Pas de nom de domaine à acheter : `API_DOMAIN` peut être `<ip-avec-tirets>.sslip.io` (ex. `140-238-1-2.sslip.io`), qui pointe vers l'IP publique.

## Prérequis du serveur

- Ports 80 et 443 ouverts dans la Security List du VCN **et** dans le pare-feu de la VM (les images Ubuntu d'Oracle bloquent tout par `iptables`, sauf SSH).
- Docker et le plugin Compose installés.

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

Depuis la racine du dépôt, sur le PC :

```sh
scp -r -i ~/.ssh/zabava_oracle backend/src backend/gradle backend/gradlew backend/*.kts backend/Dockerfile backend/.dockerignore ubuntu@<ip>:~/zabava/backend/
scp -i ~/.ssh/zabava_oracle deploy/compose.yml deploy/Caddyfile ubuntu@<ip>:~/zabava/deploy/
ssh -i ~/.ssh/zabava_oracle ubuntu@<ip> "cd ~/zabava/deploy && docker compose up -d --build"
```

Vérification : `https://<API_DOMAIN>/actuator/health` répond `{"status":"UP"}`.
