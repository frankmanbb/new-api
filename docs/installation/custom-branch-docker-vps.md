# Deploy a Custom Branch to a VPS with Docker

This guide deploys a custom New API branch as a Docker image. The example uses
the `feat/media-playground` branch from `frankmanbb/new-api`, PostgreSQL, Redis,
and Caddy for automatic HTTPS.

Do not use `calciumion/new-api:latest` when deploying custom branch changes.
Build the repository's `Dockerfile` instead.

## Recommended architecture

- Caddy for HTTPS and reverse proxying
- A custom New API Docker image
- PostgreSQL 15
- Redis 7
- Persistent Docker volumes
- Daily encrypted off-site backups

A practical starting VPS has Ubuntu 24.04, 4 vCPUs, 4–8 GB RAM, and at least
40 GB of SSD storage. Building the image may require more memory than running
it. For a smaller server, build in CI and pull the resulting image from a
container registry.

## 1. Prepare DNS and the VPS

Create an `A` record pointing the deployment hostname to the VPS:

```text
api.example.com -> VPS_PUBLIC_IP
```

Allow these inbound ports:

- `22` from trusted administrative IP addresses where possible
- `80` and `443` publicly

Do not expose application port `3000`, PostgreSQL port `5432`, or Redis port
`6379` publicly.

Install Docker Engine and the Docker Compose plugin from Docker's official
installation instructions, then verify them:

```bash
docker version
docker compose version
```

## 2. Clone and build the branch

```bash
sudo mkdir -p /opt/new-api
sudo chown "$USER":"$USER" /opt/new-api

git clone --branch feat/media-playground --single-branch \
  https://github.com/frankmanbb/new-api.git \
  /opt/new-api/source

cd /opt/new-api/source
git rev-parse HEAD
docker build --pull -t new-api:media-playground .
```

Use an immutable tag containing the commit SHA for repeatable releases:

```bash
IMAGE_TAG="media-playground-$(git rev-parse --short HEAD)"
docker build --pull -t "new-api:${IMAGE_TAG}" .
```

Use that tag in the Compose configuration below.

## 3. Generate deployment secrets

Generate separate secrets on the VPS:

```bash
openssl rand -hex 32 # PostgreSQL password
openssl rand -hex 32 # Redis password
openssl rand -hex 32 # SESSION_SECRET
openssl rand -hex 32 # CRYPTO_SECRET
```

Create `/opt/new-api/deploy/.env`:

```dotenv
DOMAIN=api.example.com
TZ=UTC

POSTGRES_PASSWORD=replace_with_generated_value
REDIS_PASSWORD=replace_with_generated_value
SESSION_SECRET=replace_with_generated_value
CRYPTO_SECRET=replace_with_generated_value
IMAGE_TAG=media-playground-replace_with_commit_sha
```

Use hexadecimal secrets so they do not require URL escaping. Protect the file:

```bash
chmod 600 /opt/new-api/deploy/.env
```

Never commit this file or transmit its contents through chat, issue trackers,
or unencrypted email.

## 4. Create the production Compose configuration

Create `/opt/new-api/deploy/compose.yaml`:

```yaml
services:
  new-api:
    image: new-api:${IMAGE_TAG}
    restart: unless-stopped
    command: --log-dir /app/logs
    environment:
      SQL_DSN: postgresql://newapi:${POSTGRES_PASSWORD}@postgres:5432/newapi
      REDIS_CONN_STRING: redis://:${REDIS_PASSWORD}@redis:6379/0
      SESSION_SECRET: ${SESSION_SECRET}
      CRYPTO_SECRET: ${CRYPTO_SECRET}
      SESSION_COOKIE_SECURE: "true"
      SESSION_COOKIE_TRUSTED_URL: https://${DOMAIN}
      TRUSTED_PROXIES: 172.30.0.0/24
      NODE_NAME: vps-1
      TZ: ${TZ}
      ERROR_LOG_ENABLED: "true"
      BATCH_UPDATE_ENABLED: "true"
    volumes:
      - app_data:/data
      - app_logs:/app/logs
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test:
        - CMD-SHELL
        - wget -q -O - http://localhost:3000/api/status | grep '"success":true'
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - internal

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: newapi
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: newapi
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U newapi -d newapi"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks:
      - internal

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    environment:
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    command:
      - sh
      - -c
      - exec redis-server --appendonly yes --requirepass "$${REDIS_PASSWORD}"
    volumes:
      - redis_data:/data
    healthcheck:
      test:
        - CMD-SHELL
        - redis-cli -a "$${REDIS_PASSWORD}" ping | grep PONG
      interval: 10s
      timeout: 5s
      retries: 10
    networks:
      - internal

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    environment:
      DOMAIN: ${DOMAIN}
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      new-api:
        condition: service_healthy
    networks:
      - internal

volumes:
  app_data:
  app_logs:
  postgres_data:
  redis_data:
  caddy_data:
  caddy_config:

networks:
  internal:
    ipam:
      config:
        - subnet: 172.30.0.0/24
```

Create `/opt/new-api/deploy/Caddyfile`:

```caddyfile
{$DOMAIN} {
    encode zstd gzip

    reverse_proxy new-api:3000 {
        flush_interval -1
    }
}
```

`SESSION_COOKIE_TRUSTED_URL` must contain the exact public HTTPS origin. It
does not accept wildcards or paths. The configured Docker subnet is explicitly
trusted because Caddy forwards requests to New API from that network.

## 5. Start and verify the deployment

```bash
cd /opt/new-api/deploy
docker compose config
docker compose up -d
docker compose ps
docker compose logs -f new-api caddy
```

Verify the public status endpoint:

```bash
curl -fsS https://api.example.com/api/status
```

Visit the domain and complete the initialization wizard. Create a strong root
password and enable MFA or a passkey.

## 6. Optional container registry workflow

Building directly on the VPS requires no registry credentials. To build
elsewhere and publish to GitHub Container Registry instead:

```bash
docker login ghcr.io -u YOUR_GITHUB_USERNAME
docker buildx build \
  --platform linux/amd64 \
  --tag ghcr.io/frankmanbb/new-api:media-playground-COMMIT_SHA \
  --push .
```

Use `linux/arm64` for an ARM VPS, or publish both architectures. A private GHCR
package requires a token with `write:packages` when publishing and a token with
`read:packages` on the VPS. Prefer GitHub Actions' short-lived `GITHUB_TOKEN`
over a long-lived personal access token when possible.

## Third-party service recommendations

The server can start without AI provider credentials, but it cannot relay model
requests until at least one channel is configured in the admin UI.

### Required

- A domain and DNS provider
- API credentials for the upstream AI providers that will be offered

Add upstream provider credentials through the channel administration UI rather
than placing them in Compose unless a specific integration documents an
environment variable.

### Recommended for a public service

- **Transactional email:** Postmark, Amazon SES, Mailgun, or Resend SMTP for
  email verification and password recovery
- **Abuse protection:** Cloudflare Turnstile for login and registration
- **Backups:** encrypted daily PostgreSQL dumps copied to S3, Backblaze B2, or
  another off-site destination
- **Monitoring:** Uptime Kuma or Better Stack for status and alerting
- **Managed PostgreSQL:** recommended when uptime and recovery are more
  important than minimizing cost

### Optional

- GitHub, Discord, or OIDC client credentials for social login
- Stripe or another supported payment provider when selling quota
- Pyroscope for application profiling
- Cloudflare proxying; begin with DNS-only mode because proxy response timeouts
  can affect long non-streaming AI requests

## Secrets and information needed for assisted deployment

Provide these non-secret details:

- VPS hostname or IP address, operating system, CPU architecture, and SSH user
- Confirmation that SSH public-key access is already installed
- Public domain name and current DNS status
- Local or managed PostgreSQL preference
- Expected traffic and number of users
- Whether the image should be built on the VPS or published through GHCR
- Whether SMTP, Turnstile, OAuth, payment processing, or monitoring is needed

The deployment uses these secrets:

- PostgreSQL password
- Redis password
- `SESSION_SECRET`
- `CRYPTO_SECRET`
- Upstream AI provider API keys
- Optional SMTP password, Turnstile secret, OAuth client secrets, payment
  provider secrets, and registry token

Do not paste secrets or private SSH keys into chat. Generate them on the VPS or
make them available through a dedicated secret manager.

## Backups and updates

Create a PostgreSQL backup before every upgrade:

```bash
cd /opt/new-api/deploy
docker compose exec -T postgres \
  pg_dump -U newapi -d newapi | gzip > "new-api-$(date +%F-%H%M%S).sql.gz"
```

Copy backups off the VPS and test restoration periodically. Also back up any
required application data from the `app_data` volume.

To deploy a later branch revision:

```bash
cd /opt/new-api/source
git fetch origin feat/media-playground
git checkout feat/media-playground
git pull --ff-only

IMAGE_TAG="media-playground-$(git rev-parse --short HEAD)"
docker build --pull -t "new-api:${IMAGE_TAG}" .
```

Update `IMAGE_TAG` in `/opt/new-api/deploy/.env`, then recreate the application:

```bash
cd /opt/new-api/deploy
docker compose up -d
docker compose ps
```

Keep the previous image and database backup until the new release has been
verified. A container rollback may not be safe after an incompatible database
migration, so database restoration must be part of the rollback plan.

