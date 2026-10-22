# Web Security Baseline

This project is a static landing page with a dedicated lead API backend. Strong protection comes from code hardening plus runtime controls.

## 1) Already applied in code

- Strict frontend CSP via `<meta http-equiv="Content-Security-Policy">`.
- No dynamic HTML rendering from user input.
- Form input constraints (`minlength`, `maxlength`) and lightweight client-side sanitization.
- Bot-trap honeypot field in contact form.
- Minimum form-fill time and client-side submit throttling.
- Mobile navigation with keyboard close (`Esc`) and overlay lock.
- Turnstile challenge integrated on both `/` and `/en/`.
- Browser now sends lead data only to same-origin `/api/lead`.
- Server-side validation, rate limit, origin/referer checks, and captcha verification.
- Turnstile response is verified by expected action and allowed hostnames.
- API rejects unexpected JSON keys and validates `sourceUrl` origin.
- API checks `Sec-Fetch-Site` to reduce cross-site abuse attempts.
- Client IP extraction now prefers `X-Real-IP` from trusted proxies to prevent spoofed `X-Forwarded-For` bypass.
- Rate limiter has a max-key ceiling (`LEAD_RATE_MAX_ENTRIES`) to reduce memory DoS risk.
- API server enforces request/header/keep-alive timeouts and max connection caps.
- Production startup can run in strict mode (`LEAD_STRICT_STARTUP=true`) and fail on unsafe config.
- Admin portal routes are protected by server-side session cookie (`HttpOnly`, `SameSite=Strict`) and login throttling.
- Structured audit logging is enabled with sensitive-field redaction.

## 2) Required at Nginx level

1. Include `deployment/nginx/http-hardening.conf` inside `http {}`.
2. Include `deployment/nginx/server-hardening.conf` inside TLS `server {}`.
3. If you use Cloudflare/CDN, include `deployment/nginx/cloudflare-realip.conf` and trust only CDN IP ranges.
4. For `/api/lead`, keep `proxy_set_header X-Real-IP $remote_addr;` and overwrite `X-Forwarded-For` (do not append client-supplied XFF).
5. Optional: enable ModSecurity snippet `deployment/nginx/waf-modsecurity.conf` after installing CRS.
6. Test config: `nginx -t`
7. Reload safely: `nginx -s reload`

## 3) TLS and transport

- Enforce HTTPS only.
- Use TLS 1.2+ and strong ciphers.
- Keep HSTS enabled after HTTPS is stable.

## 4) Deployment controls

- Run Nginx as non-root worker user.
- Keep OS and Nginx patched regularly.
- Disable directory listing.
- Restrict write permission on web root.
- Keep backups immutable/offsite and test restore.
- Enable fail2ban for automated temporary bans.
- Enable IDS/IPS (Suricata) with tuned custom rules.
- Forward logs to SIEM (Vector/Wazuh/Elastic/Splunk).

## 5) Verification quick checks

- `curl -I https://your-domain` and confirm security headers are present.
- `node deployment/scripts/preflight-security.js .env` and confirm it passes before go-live.
- Scan with OWASP ZAP baseline and fix medium/high issues.
- Re-run checks after every deployment.
- `curl -I https://your-domain/api/lead` should return `405` with `Allow: POST`.
- `curl -I https://your-domain/login` should return admin login page (noindex).
- Submit a lead from both `/` and `/en/` and verify inbox delivery.
- Run backend security tests locally: `node server/tests/lead-api.test.js`
- Run admin API tests locally: `node server/tests/admin-api.test.js`
- Confirm fail2ban jails are active: `fail2ban-client status`.
- Confirm Suricata rules load cleanly: `suricata -T -c /etc/suricata/suricata.yaml -v`.

## 6) Important note

Client-side checks are not a trust boundary. The `/api/lead` backend now enforces:

- server-side validation and payload-shape enforcement,
- origin/referer and `Sec-Fetch-Site` checks,
- IP rate-limit and optional denylist (`BLOCKED_IPS`),
- trusted-proxy IP extraction (`TRUSTED_PROXY_IPS`), with XFF fallback disabled by default,
- memory and socket hardening (`LEAD_RATE_MAX_ENTRIES`, timeout and connection limits),
- captcha verification on server side before forwarding.

## 7) Deployment notes

- Update canonical domain values if production domain differs from `hovanduy.com`.
- Copy `.env.example` to `.env` and set:
  - `TURNSTILE_SECRET_KEY`
  - `TURNSTILE_SITE_KEY`
  - `TURNSTILE_EXPECTED_ACTION`
  - `TURNSTILE_ALLOWED_HOSTNAMES`
  - `LEAD_FORWARD_ENDPOINT`
  - `ALLOWED_ORIGINS`
  - `AUDIT_LOG_SALT`
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`
  - optional hardening: `LEAD_RATE_MAX_ENTRIES`, `LEAD_REQUEST_TIMEOUT_MS`, `LEAD_HEADERS_TIMEOUT_MS`, `LEAD_KEEPALIVE_TIMEOUT_MS`, `LEAD_MAX_CONNECTIONS`, `TRUSTED_PROXY_IPS`
  - enforce `NODE_ENV=production` and `LEAD_STRICT_STARTUP=true` in production
  - keep `TRUST_PROXY_X_FORWARDED_FOR=false` unless you have a verified proxy chain that cannot send `X-Real-IP`
- Start lead API service behind Nginx:
  - `systemctl enable sentinel-lead-api`
  - `systemctl start sentinel-lead-api`
- Replace Turnstile site key in `index.html` and `en/index.html` before production.
- Runtime stack guide: `deployment/SECURITY-STACK.md`
- CI security pipeline: `.github/workflows/security-pipeline.yml`
