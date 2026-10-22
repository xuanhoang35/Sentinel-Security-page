# Deployment Guide (VPS + Nginx + Lead API)

## 1) Prepare environment

1. Copy `.env.example` to `.env`.
2. Set real values:
   - `NODE_ENV=production`
   - `LEAD_STRICT_STARTUP=true`
   - `TURNSTILE_SECRET_KEY`
   - `TURNSTILE_SITE_KEY`
   - `TURNSTILE_EXPECTED_ACTION`
   - `TURNSTILE_ALLOWED_HOSTNAMES`
   - `LEAD_FORWARD_ENDPOINT`
   - `ALLOWED_ORIGINS`
   - `AUDIT_LOG_SALT`
   - optional hardening knobs:
     - rate/body (`LEAD_RATE_LIMIT_COUNT`, `LEAD_RATE_MAX_ENTRIES`, `LEAD_BLOCK_FOR_MS`, `LEAD_MAX_BODY_BYTES`)
     - HTTP timeouts (`LEAD_REQUEST_TIMEOUT_MS`, `LEAD_HEADERS_TIMEOUT_MS`, `LEAD_KEEPALIVE_TIMEOUT_MS`)
     - proxy trust (`TRUSTED_PROXY_IPS`, keep `TRUST_PROXY_X_FORWARDED_FOR=false` unless you require XFF fallback)
   - admin portal:
     - `ADMIN_EMAIL` (default: `admin@example.com`)
     - `ADMIN_PASSWORD` (default: `REPLACE_WITH_STRONG_PASSWORD_MIN_12`)
     - `ADMIN_COOKIE_NAME`, `ADMIN_SESSION_TTL_MS`, `ADMIN_LOGIN_RATE_LIMIT_COUNT`
     - `LEAD_STORAGE_PATH` (ví dụ `./data/leads.ndjson`, file lưu lead cho dashboard admin)

3. Keep `TRUST_PROXY_X_FORWARDED_FOR=false` for Nginx deployments that set `X-Real-IP`.
   Enable it only when your reverse-proxy chain cannot provide `X-Real-IP` and you have validated XFF behavior.

## 2) Turnstile keys

Replace the test key in:

- `index.html` (`data-sitekey`)
- `en/index.html` (`data-sitekey`)

Run preflight check (fails fast if config/key is unsafe for production):

```bash
node deployment/scripts/preflight-security.js .env
```

## 3) Run lead API

```bash
node server/lead-api.js
```

For production, use `deployment/systemd/sentinel-lead-api.service` and enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable sentinel-lead-api
sudo systemctl start sentinel-lead-api
```

## 4) Apply Nginx hardening

1. Include `deployment/nginx/http-hardening.conf` in `http {}`.
2. Include `deployment/nginx/server-hardening.conf` in your TLS `server {}`.
3. If you use Cloudflare, generate and include real-IP trust list:

```bash
sudo bash deployment/scripts/update-cloudflare-realip.sh /etc/nginx/conf.d/cloudflare-realip.conf
```

4. Validate and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 5) Enable runtime security stack

Use `deployment/SECURITY-STACK.md` to enable:

- WAF: ModSecurity + OWASP CRS
- IDS/IPS: Suricata
- Auto-ban: Fail2ban
- SIEM forwarding: Vector

## 6) Enable CI security pipeline

Workflow file: `.github/workflows/security-pipeline.yml`

Set repository secret for DAST target:

- `DAST_TARGET_URL` (example: `https://hovanduy.com`)

Then run workflow manually once from GitHub Actions.

## 7) Verify

- `curl -I https://your-domain` -> confirm security headers.
- `curl -I https://your-domain/api/lead` -> should be `405 Method Not Allowed`.
- `curl -I https://your-domain/login` -> should return admin login page.
- Submit forms on `/` and `/en/`, verify lead delivery.
- Run backend tests before deploy:

```bash
node server/tests/config-validation.test.js
node server/tests/rate-limiter.test.js
node server/tests/validation.test.js
node server/tests/audit-logger.test.js
node server/tests/lead-api.test.js
node server/tests/admin-api.test.js
```
