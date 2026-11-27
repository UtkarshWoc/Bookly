# Deploying Bookly 🎟️

This guide outlines the production deployment requirements, environment configuration, build and startup procedures, secret rotation, and operational runbook for **Bookly**.

---

## 1. Overview & Network Model

Bookly consists of an nginx API gateway, five backend microservices (four REST, one internal gRPC), a Next.js web application, Redis, and MongoDB.

- **Only the API gateway publishes host ports** in production (typically port `80` and `443`).
- **All backend services, Redis, and MongoDB reside on the internal private Docker network** (`bookly`). They must never be published directly to public interfaces.
- The dev-only gRPC proxy (`127.0.0.1:9090`) binds to the loopback interface by default and can be disabled or omitted in production.

---

## 2. Required Environment Variables

All variables are loaded from the root `.env` file (interpolated by Docker Compose and injected into containers).

| Variable | Required | Default / Safe Value | Description |
| :--- | :--- | :--- | :--- |
| `COMPOSE_PROJECT_NAME` | No | `bookly` | Prefix for container and network names. |
| `NODE_ENV` | Yes | `production` | Node.js runtime environment. |
| `LOG_LEVEL` | No | `info` | Logging verbosity (`info`, `warn`, `error`). |
| `GATEWAY_PORT` | Yes | `80` (or `8080`) | Public HTTP port published by the nginx gateway. |
| `GRPC_GATEWAY_HOST` | No | `127.0.0.1` | Host interface for the dev gRPC proxy. Set to `127.0.0.1`. |
| `GRPC_GATEWAY_PORT` | No | `9090` | Dev gRPC proxy port. |
| `LOGIN_RATE_LIMIT` | Yes | `5r/m` | Gateway rate limit on `/api/auth/login` and `/api/auth/register`. |
| `LOGIN_RATE_BURST` | Yes | `3` | Gateway burst allowance for login attempts. |
| `API_RATE_LIMIT` | Yes | `20r/s` | General API rate limit per client IP. |
| `GATEWAY_EVENTS_CACHE_SECONDS` | Yes | `15` | Nginx reverse-proxy cache TTL for public event catalog. |
| `MONGO_URI` | Yes | `mongodb://mongo:27017` | MongoDB connection URI. |
| `MONGO_PORT` | No | `27017` | MongoDB internal container port. |
| `REDIS_PORT` | No | `6379` | Redis internal container port. |
| `AUTH_SERVICE_PORT` | Yes | `8001` | Internal HTTP port for auth-service. |
| `AUTH_DB_NAME` | Yes | `bookly_auth` | Database name for auth accounts. |
| `AUTH_REDIS_URL` | Yes | `redis://redis:6379/0` | Redis database 0 for JWT blacklist. |
| `JWT_SECRET` | **YES** | *None (Must generate)* | Minimum 64-character random secret used to sign JWTs. |
| `JWT_EXPIRES_IN` | Yes | `1h` | JWT validity duration (e.g. `15m`, `1h`). |
| `BCRYPT_ROUNDS` | Yes | `10` | Password hashing work factor. |
| `ADMIN_NAME` | Yes | `Bookly Admin` | Display name of the initial bootstrap administrator. |
| `ADMIN_EMAIL` | **YES** | *Set production email* | Admin account email bootstrapped on initial boot. |
| `ADMIN_PASSWORD` | **YES** | *Set strong password* | Initial password for the bootstrap admin. |
| `EVENT_SERVICE_PORT` | Yes | `8002` | Internal HTTP port for event-service. |
| `EVENT_DB_NAME` | Yes | `bookly_events` | Database name for event catalog. |
| `EVENT_REDIS_URL` | Yes | `redis://redis:6379/1` | Redis database 1 for event catalog cache. |
| `EVENT_CACHE_TTL_SECONDS` | Yes | `60` | Cache-aside TTL for event detail lookups. |
| `SEED_EVENTS` | Yes | `false` | Set to `false` in production. Only `true` for demo/testing. |
| `SEAT_SERVICE_PORT` | Yes | `50051` | Internal gRPC port for seat-service. |
| `SEAT_DB_NAME` | Yes | `bookly_seats` | Database name for confirmed seat records. |
| `SEAT_REDIS_URL` | Yes | `redis://redis:6379/2` | Redis database 2 for distributed seat locks. |
| `SEAT_LOCK_TTL_SECONDS` | Yes | `300` | Duration (5 minutes) a seat remains locked while holding. |
| `BOOKING_SERVICE_PORT` | Yes | `8003` | Internal HTTP port for booking-service. |
| `BOOKING_REPLICAS` | Yes | `2` | Number of booking-service worker replicas. |
| `BOOKING_DB_NAME` | Yes | `bookly_bookings` | Database name for user bookings. |
| `BOOKING_REDIS_URL` | Yes | `redis://redis:6379/3` | Redis database 3 for idempotency keys. |
| `SEAT_SERVICE_ADDR` | Yes | `seat-service:50051` | Internal gRPC address of seat-service. |
| `EVENT_SERVICE_URL` | Yes | `http://event-service:8002` | Internal HTTP address of event-service. |
| `EVENT_SERVICE_TIMEOUT_MS`| No | `2000` | HTTP client timeout when booking calls event catalog. |
| `GRPC_DEADLINE_MS` | No | `2000` | gRPC deadline per call. |
| `GRPC_MAX_RETRIES` | No | `2` | Retries with exponential backoff on retryable gRPC codes. |
| `IDEMPOTENCY_TTL_SECONDS` | Yes | `86400` | Retention duration for idempotency keys (24 hours). |
| `MAX_SEATS_PER_BOOKING` | Yes | `8` | Maximum seats allowable per reservation hold. |
| `MAX_ACTIVE_HOLDS_PER_USER`| Yes | `3` | Maximum active holds allowable per user account. |
| `PAYMENT_LATENCY_MS` | No | `700` | Simulated payment processing latency. |
| `PAYMENT_DECLINE_CARD` | No | `4000000000000002` | Card number reserved for declined payment testing. |
| `NOTIFICATION_SERVICE_PORT`| Yes | `8004` | Internal HTTP port for notification-service. |
| `NOTIFICATION_DB_NAME` | Yes | `bookly_notifications` | Database name for user notifications. |
| `NOTIFICATION_REDIS_URL` | Yes | `redis://redis:6379/4` | Redis database 4 for subscriber connection. |
| `BOOKING_EVENTS_CHANNEL` | Yes | `bookly.bookings` | Redis Pub/Sub topic for booking domain events. |
| `FRONTEND_PORT` | Yes | `3000` | Internal Next.js container listening port. |
| `API_GATEWAY_URL` | No | `http://localhost:8080` | Dev-only proxy target for local `npm run dev`. |
| `NEXT_PUBLIC_API_URL` | No | `/api` | Browser-facing API base path. |

---

## 3. Production Build & Startup

### Step 1: Prepare Environment File
Generate a cryptographically secure JWT secret and configure production credentials:

```bash
cp .env.example .env
```
Generate `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Ensure in `.env`:
- `JWT_SECRET` is set to the generated string.
- `ADMIN_PASSWORD` is set to a secure administrator password.
- `SEED_EVENTS=false`
- `NODE_ENV=production`

### Step 2: Build the Container Images
Build all images cleanly without using stale caches:

```bash
docker compose build --no-cache
```

### Step 3: Start the Stack
Start all services in detached mode:

```bash
docker compose up -d
```

### Step 4: Verify Container Health
Check that all containers report `healthy`:

```bash
docker compose ps
```

---

## 4. Health Check Endpoints

Each service provides an HTTP or process-level health probe:

| Service | Internal Probe URL / Command | Healthy Condition |
| :--- | :--- | :--- |
| **API Gateway** | `GET http://127.0.0.1/api/health` | HTTP 200, gateway operational |
| **Auth Service** | `GET http://127.0.0.1:8001/health` | HTTP 200, Mongo connected, Redis ready |
| **Event Service** | `GET http://127.0.0.1:8002/health` | HTTP 200, Mongo connected, Redis ready |
| **Seat Service** | `node src/healthcheck.js` | Exit 0, gRPC round-trip exercises DB & Redis |
| **Booking Service** | `GET http://127.0.0.1:8003/health` | HTTP 200, Mongo connected, Redis ready |
| **Notification Service** | `GET http://127.0.0.1:8004/health` | HTTP 200, Mongo connected, Redis subscribed |
| **Frontend** | `GET http://127.0.0.1:3000/` | HTTP 200, Next.js server responsive |
| **MongoDB** | `mongosh --eval "db.adminCommand('ping').ok"` | Exit 0, daemon responding |
| **Redis** | `redis-cli ping` | Returns PONG |

Public probe through the gateway:
```bash
curl -i http://localhost:8080/api/health
```

---

## 5. Secret Rotation Procedures

### A. Rotating `JWT_SECRET`
Rotating `JWT_SECRET` invalidates all currently active client sessions, requiring users to log in again:
1. Generate a new secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update `JWT_SECRET` in `.env`.
3. Recreate the auth service:
   ```bash
   docker compose up -d --no-deps auth-service
   ```
4. Optional: Flush the token blacklist in Redis db0:
   ```bash
   docker compose exec redis redis-cli -n 0 FLUSHDB
   ```

### B. Rotating the Admin Password
The bootstrap admin account is created once on initial start. To update the admin password subsequently:
1. Log in to the application as admin.
2. If updating directly via the database, generate a new bcrypt hash:
   ```bash
   node -e "console.log(require('bcryptjs').hashSync('YourNewPassword', 10))"
   ```
3. Update the admin document in MongoDB `bookly_auth.users`:
   ```bash
   docker compose exec mongo mongosh bookly_auth --eval "db.users.updateOne({ role: 'admin' }, { \$set: { passwordHash: '<new-hash>' } })"
   ```
4. Update `ADMIN_PASSWORD` in `.env` for configuration consistency.

---

## 6. Production Infrastructure Runbook

### TLS / SSL Termination & Reverse Proxy
The included nginx gateway terminates TLS 1.2/1.3 natively on port `443` (mapped to `GATEWAY_HTTPS_PORT`, default `8443`), generating a self-signed development certificate on boot when custom certs are absent. In production:
- Mount your CA-signed certificate and private key at `TLS_CERT_PATH` (`/etc/nginx/certs/tls.crt`) and `TLS_KEY_PATH` (`/etc/nginx/certs/tls.key`), or terminate TLS at an edge Ingress/ALB (`k8s/ingress.yaml`).
- Ensure any upstream edge proxy forwards standard headers:
  - `X-Forwarded-Proto https;`
  - `X-Forwarded-For $remote_addr;`
  - `Host $host;`

### Kubernetes Deployment
Ready-to-apply Kustomize manifests live in [`k8s/`](k8s/README.md) (`namespace`, `ConfigMap`, `Secret` template, `StatefulSet`s for MongoDB & Redis, `Deployment`s, `HorizontalPodAutoscaler` for `booking-service`, TLS `Ingress`, and `NetworkPolicy` isolation):
```bash
kubectl apply -k k8s/
```

### Disabling the Dev gRPC Proxy
The gRPC loopback proxy (`9090`) is intended for local race tests and debugging with `grpcurl`. In production:
- In `docker-compose.yml`, remove or comment out:
  ```yaml
  # - "${GRPC_GATEWAY_HOST:-127.0.0.1}:${GRPC_GATEWAY_PORT:-9090}:9090"
  ```
- Alternatively, leave `GRPC_GATEWAY_HOST=127.0.0.1` so it binds solely to the host loopback and is never exposed externally.

### Persistent Volumes
Data persistence is handled by named Docker volumes:
- `mongo-data`: mapped to `/data/db`
- `redis-data`: mapped to `/data` (configured with `--appendonly yes`)

Ensure the host filesystem backing Docker volumes has adequate disk space and is located on persistent block storage.

### Backups
- **MongoDB Backup:**
  ```bash
  docker compose exec mongo mongodump --archive="/data/db/backup-$(date +%F).gz" --gzip
  ```
- **MongoDB Restore:**
  ```bash
  docker compose exec mongo mongorestore --archive="/data/db/backup-<date>.gz" --gzip
  ```
- **Redis Snapshot:**
  ```bash
  docker compose exec redis redis-cli bgsave
  ```

### Horizontal Scaling
To scale the booking service across additional replicas:
```bash
docker compose up -d --scale booking-service=4
docker compose restart api-gateway
```
Nginx re-resolves the upstream DNS and load-balances across all active replicas.
