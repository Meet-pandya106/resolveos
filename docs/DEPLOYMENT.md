# ResolveOS — Production Deployment & Operations Guide

## 1. Production Architecture Overview

In a typical production deployment:
- **Frontend SPA**: Hosted via static CDN / Cloudflare Pages / Vercel / Nginx.
- **Backend API**: Hosted on Node.js container (AWS ECS, Render, Railway, Fly.io, or VPS).
- **Database**: Managed PostgreSQL instance (AWS RDS, Supabase, Neon, or Railway).

```text
User Browser / PWA
       │ (HTTPS / WSS)
       ▼
Reverse Proxy (Nginx / Cloudflare)
       │
       ├──► /api/* & /ws  ──► Fastify Node Server (Port 4000)
       │                              │
       │                              ▼
       │                      PostgreSQL Database (Port 5432)
       │
       └──► /*            ──► Static React Dist (apps/web/dist)
```

---

## 2. Docker Compose Deployment

The fastest way to deploy the entire production stack:

```bash
# 1. Clone repository
git clone https://github.com/<your-org>/resolveos.git
cd resolveos

# 2. Configure environment variables in .env
cp .env.example .env
# (Edit .env with production passwords and secrets)

# 3. Launch Docker Compose stack
docker compose up --build -d
```

---

## 3. Production Environment Hardening Checklist

Ensure the following variables are securely configured before starting the production server:

```bash
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
DATABASE_URL=postgres://resolveos_user:SECURE_STRONG_PASSWORD@postgres:5432/resolveos
JWT_SECRET=MINIMUM_32_CHAR_CRYPTOGRAPHICALLY_RANDOM_SECRET_KEY
SESSION_SECRET=MINIMUM_32_CHAR_CRYPTOGRAPHICALLY_RANDOM_SECRET_KEY
CORS_ORIGIN=https://resolveos.yourdomain.com
RATE_LIMIT_MAX=120
RATE_LIMIT_TIME_WINDOW_MS=60000
```

---

## 4. Reverse Proxy Configuration (Nginx Example)

```nginx
server {
    listen 443 ssl http2;
    server_name resolveos.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/resolveos.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/resolveos.yourdomain.com/privkey.pem;

    # Frontend Static SPA
    location / {
        root /var/www/resolveos/apps/web/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Proxy
    location /ws {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```
