const toast = document.getElementById('toast');
const output = document.getElementById('project-output');
const quickList = document.getElementById('quick-list');
const tabs = Array.from(document.querySelectorAll('.project-tab'));
const showToast = (message) => {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1600);
};
const esc = (value) => String(value).replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]));
const code = (value) => `<pre><code>${esc(value)}</code></pre>`;
const ROOT = '/var/www/Sentinel Security page/Sentinel Security page';

const baseTools = [
  ['Base OS tools', 'Công cụ nền để tải source, debug, firewall và vận hành server.', 'sudo apt update && sudo apt -y install curl wget git unzip ca-certificates gnupg lsb-release ufw fail2ban htop iotop sysstat'],
  ['Nginx', 'Reverse proxy, static route, upload limit, security headers.', 'sudo apt -y install nginx\nsudo systemctl enable --now nginx\nnginx -v'],
  ['Certbot', 'Cấp SSL Let\'s Encrypt nếu không dùng Cloudflare Origin Certificate.', 'sudo apt -y install certbot python3-certbot-nginx\nsudo certbot --nginx -d DOMAIN -d www.DOMAIN'],
  ['Node.js LTS', 'Runtime cho API/app và build frontend.', 'curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -\nsudo apt -y install nodejs\nnode -v && npm -v'],
  ['PM2', 'Process manager cho Node app/static server.', 'sudo npm i -g pm2\npm2 -v\npm2 startup'],
  ['Docker Engine', 'Chạy service container khi cần.', 'curl -fsSL https://get.docker.com | sudo sh\nsudo usermod -aG docker $USER\ndocker version'],
  ['Docker Compose plugin', 'Chạy stack app, DB, Redis, monitoring bằng compose.', 'sudo apt -y install docker-compose-plugin\ndocker compose version'],
  ['Cloudflare Tunnel', 'Tunnel outbound từ server tới Cloudflare.', 'curl -L --output /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb\nsudo dpkg -i /tmp/cloudflared.deb || sudo apt -f -y install\ncloudflared --version'],
  ['PostgreSQL', 'Database production hoặc client backup/restore.', 'sudo apt -y install postgresql postgresql-contrib postgresql-client\npsql --version'],
  ['Redis', 'Cache/session/queue.', 'sudo apt -y install redis-server\nsudo systemctl enable --now redis-server\nredis-cli ping'],
  ['Monitoring tools', 'Exporter và công cụ quan sát hệ thống.', 'sudo apt -y install prometheus-node-exporter\nsudo systemctl enable --now prometheus-node-exporter'],
  ['Security tools', 'Audit baseline và scan image/dependency.', 'sudo apt -y install lynis\ncurl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sudo sh -s -- -b /usr/local/bin']
];

const makeProject = (id, name, domain, stack) => ({
  id, name, domain, stack,
  root: `/var/www/${id}`,
  runtime: 'PM2 hoặc systemd sau Nginx reverse proxy',
  data: `PostgreSQL database ${id}, upload tại /var/lib/${id}/uploads`,
  links: [['Production', `https://${domain}`], ['Admin', `https://${domain}/admin`], ['Health', `https://${domain}/health`], ['Runbook', '/setupdev']],
  tools: [],
  overview: [
    'Server bắt đầu từ Ubuntu/Debian sạch, cập nhật hệ điều hành, tạo user deploy và khóa SSH bằng key.',
    'Source code nằm trong webroot riêng, env tách khỏi Git, app bind localhost hoặc Unix socket.',
    'Nginx chịu trách nhiệm public HTTP/HTTPS, reverse proxy, security headers, timeout và route static.',
    'Database có user riêng, quyền tối thiểu, backup hằng ngày và restore drill định kỳ.'
  ],
  env: `NODE_ENV=production\nAPP_PORT=3000\nAPP_URL=https://${domain}\nDATABASE_URL=postgresql://${id}_user:CHANGE_ME@127.0.0.1:5432/${id}\nREDIS_URL=redis://127.0.0.1:6379/0\nSESSION_SECRET=CHANGE_ME_64_CHARS\nJWT_SECRET=CHANGE_ME_64_CHARS\nSMTP_HOST=smtp.example.com\nSMTP_USER=CHANGE_ME\nSMTP_PASS=CHANGE_ME\nUPLOAD_DIR=/var/lib/${id}/uploads\nLOG_LEVEL=info`,
  nginx: `server {\n    listen 80;\n    listen [::]:80;\n    server_name ${domain} www.${domain};\n\n    add_header X-Frame-Options "SAMEORIGIN" always;\n    add_header X-Content-Type-Options "nosniff" always;\n    add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n\n    location = /health {\n        proxy_pass http://127.0.0.1:3000/health;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n\n    location / {\n        proxy_pass http://127.0.0.1:3000;\n        proxy_http_version 1.1;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_read_timeout 120;\n    }\n}`,
  db: `sudo apt -y install postgresql postgresql-contrib\nsudo -u postgres psql <<SQL\nCREATE USER ${id}_user WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';\nCREATE DATABASE ${id} OWNER ${id}_user;\nGRANT ALL PRIVILEGES ON DATABASE ${id} TO ${id}_user;\nSQL\n\nsudo mkdir -p /backup/${id}\npg_dump -Fc postgresql://${id}_user:PASS@127.0.0.1:5432/${id} > /backup/${id}/${id}-$(date +%F).dump`,
  deploy: `cd /var/www/${id}\ngit fetch --all --prune\ngit checkout main\ngit pull --ff-only\nnpm ci --omit=dev\nnpm run build\npm2 reload ${id} --update-env\nsudo nginx -t && sudo nginx -s reload\ncurl -Ik https://${domain}/health`,
  checklist: ['SSH key và user deploy riêng.', 'Env production không commit vào Git.', 'Nginx config test OK trước reload.', 'Database backup/restore đã test.', 'Cloudflare không cache API/admin.', 'Monitoring health, disk, 5xx, cert expiry.', 'Có rollback path trước deploy.']
});

const projects = {
  sentinel: {
    id: 'sentinel', name: 'Sentinel Shield', domain: 'webdemo.name.vn', stack: 'Static landing + Node Lead API + Admin + Storage/NAS + LearnIT', root: ROOT,
    runtime: 'PM2: sentinel-web port 3000, sentinel-api qua Unix socket', data: `${ROOT}/data và /var/lib/monitoring-lite/storage-site`,
    links: [['Landing', '/'], ['Login', '/login'], ['Admin', '/admin'], ['Storage', '/storagesit'], ['LearnIT', '/learnit'], ['SetupDev', '/setupdev'], ['Health', '/health']],
    tools: [
      ['PM2 static serve', 'Chạy landing/static ở port 3000.', `cd "${ROOT}"\npm2 serve . 3000 --name sentinel-web --spa`],
      ['Sentinel API deps', 'Kiểm tra API lead/admin/storage.', `cd "${ROOT}"\nnode --check server/lead-api.js`],
      ['Storage directory', 'Kho file lớn ngoài webroot.', 'sudo mkdir -p /var/lib/monitoring-lite/storage-site\nsudo chown -R root:root /var/lib/monitoring-lite/storage-site\nsudo chmod 750 /var/lib/monitoring-lite/storage-site'],
      ['Unix socket runtime', 'API qua socket nội bộ.', 'sudo mkdir -p /run/landingpage\nsudo chmod 755 /run/landingpage']
    ],
    overview: ['Landing public chạy qua PM2 serve ở port 3000, Nginx kiểm tra maintenance flag trước khi proxy.', 'Admin/login/storage đi qua Node API bằng Unix socket, không public API port.', 'Storage/NAS nằm ở /var/lib/monitoring-lite/storage-site, hỗ trợ upload lớn, folder, khóa tải từng file.', '/learnit và /setupdev là static route riêng, cache no-store để cập nhật nhanh.'],
    env: `NODE_ENV=production\nLEAD_STRICT_STARTUP=true\nLEAD_API_SOCKET=/run/landingpage/lead-api.sock\nLEAD_API_BIND=127.0.0.1\nLEAD_FORWARD_ENDPOINT=https://formsubmit.co/ajax/YOUR_EMAIL\nALLOWED_ORIGINS=https://webdemo.name.vn,https://www.webdemo.name.vn\nADMIN_EMAIL=admin@example.com\nADMIN_PASSWORD_HASH=scrypt$N$r$p$saltHex$hashHex\nADMIN_TOTP_SECRET=BASE32_SECRET\nADMIN_COOKIE_SECURE=false\nLEAD_STORAGE_PATH=./data/leads.ndjson\nMAINTENANCE_FLAG_PATH=./data/maintenance.enabled\nMAINTENANCE_CONFIG_PATH=./assets/maintenance-config.json\nSTORAGE_SITE_DIR=/var/lib/monitoring-lite/storage-site\nSTORAGE_ACCESS_KEY=CHANGE_ME_LONG_RANDOM\nSTORAGE_MAX_UPLOAD_BYTES=16106127360\nSTORAGE_UPLOAD_TIMEOUT_MS=3600000\nAUDIT_LOG_SALT=CHANGE_ME_RANDOM`,
    nginx: `server {\n    listen 80;\n    listen [::]:80;\n    server_name webdemo.name.vn www.webdemo.name.vn;\n\n    charset utf-8;\n    real_ip_header CF-Connecting-IP;\n    real_ip_recursive on;\n\n    add_header X-Frame-Options "SAMEORIGIN" always;\n    add_header X-Content-Type-Options "nosniff" always;\n    add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n\n    location = /health {\n        proxy_pass http://unix:/run/landingpage/lead-api.sock:/health;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n\n    location ^~ /api/ {\n        client_max_body_size 15G;\n        proxy_request_buffering off;\n        proxy_pass http://unix:/run/landingpage/lead-api.sock:;\n        proxy_read_timeout 3600;\n        proxy_send_timeout 3600;\n    }\n\n    location = /login { proxy_pass http://unix:/run/landingpage/lead-api.sock:/login; }\n    location = /admin { proxy_pass http://unix:/run/landingpage/lead-api.sock:/admin; }\n    location = /storagesit { proxy_pass http://unix:/run/landingpage/lead-api.sock:/storagesit; }\n    location = /storagesit/ { proxy_pass http://unix:/run/landingpage/lead-api.sock:/storagesit/; }\n\n    location = /learnit { root "${ROOT}"; add_header Cache-Control "no-store" always; try_files /learnit.html =404; }\n    location = /setupdev { root "${ROOT}"; add_header Cache-Control "no-store" always; try_files /setupdev.html =404; }\n\n    location / {\n        error_page 503 /maintenance.html;\n        if (-f "${ROOT}/data/maintenance.enabled") { return 503; }\n        proxy_pass http://127.0.0.1:3000;\n    }\n}`,
    db: `# Sentinel không dùng SQL database. Data store chính:\n${ROOT}/data/leads.ndjson\n${ROOT}/data/maintenance.enabled\n${ROOT}/assets/maintenance-config.json\n${ROOT}/data/storage-download-locks.json\n${ROOT}/data/storage-folders.json\n/var/lib/monitoring-lite/storage-site\n\n# Backup\nsudo mkdir -p /backup/sentinel/$(date +%F)\nsudo rsync -a --numeric-ids "${ROOT}/data/" /backup/sentinel/$(date +%F)/data/\nsudo rsync -a --numeric-ids "${ROOT}/assets/maintenance-config.json" /backup/sentinel/$(date +%F)/\nsudo rsync -a --numeric-ids /var/lib/monitoring-lite/storage-site/ /backup/sentinel/$(date +%F)/storage-site/`,
    deploy: `cd "${ROOT}"\nsudo nginx -t && sudo nginx -s reload\npm2 reload sentinel-web\npm2 reload sentinel-api --update-env\ncurl -Ik https://webdemo.name.vn\ncurl -sS https://webdemo.name.vn/health`,
    checklist: ['Nginx config test OK trước reload.', 'PM2 save/startup đã cấu hình.', 'Không lưu ADMIN_PASSWORD thô nếu đã có hash.', 'Storage upload kiểm tra disk free trước file lớn.', 'Maintenance chỉ đóng landing, admin/API vẫn hoạt động.', 'Backup gồm data, storage-site, Nginx, env và source.', 'Monitoring PM2, Nginx, disk, cert, API health.']
  },
  ttfood: {
    id: 'ttfood', name: 'TTFood / Trần Thái Food', domain: 'tranthaifood.vn', stack: 'Next.js storefront + NestJS API + MongoDB + MinIO + PM2 + Nginx + Let\'s Encrypt',
    root: '/var/www/ttfood', pm2Name: 'ttfood-frontend', envPath: '/var/www/ttfood/backend/.env.example', nginxPath: '/etc/nginx/sites-available/tranthaifood.vn', nginxEnabledPath: '/etc/nginx/sites-enabled/tranthaifood.vn',
    runtime: 'PM2: ttfood-frontend npm run start port 3000, ttfood-backend node dist/main.js port 8080',
    data: 'MongoDB 7.0.26 và MinIO bucket ttfood qua /var/www/ttfood/backend MinIO client',
    links: [['Primary domain', 'https://tranthaifood.vn'], ['Primary .com', 'https://tranthaifood.com'], ['API .vn', 'https://api.tranthaifood.vn'], ['API .com', 'https://api.tranthaifood.com'], ['MinIO public', 'https://minio.tranthaifood.com'], ['Frontend GitLab', 'https://gitlab.com/code_bank/ttfood/frontend.git'], ['Backend GitLab', 'https://gitlab.com/code_bank/ttfood/backend.git']],
    tools: [
      ['Next.js frontend', 'Storefront TTFOOD chạy Next.js 15.5.9 và React 19.1.2 ở port 3000.', 'cd /var/www/ttfood/frontend\nnode -v\nnpm ci\nnpm run build\npm2 restart ttfood-frontend --update-env\npm2 logs ttfood-frontend --lines 120'],
      ['NestJS backend', 'API TTFOOD chạy NestJS 11, WebSocket, Swagger, JWT, TypeORM MongoDB và MinIO.', 'cd /var/www/ttfood/backend\nnpm ci\nnpm run build\npm2 restart ttfood-backend --update-env\npm2 logs ttfood-backend --lines 120'],
      ['MongoDB', 'Database sản phẩm, catalogue, category, media, blog, cart request, contact và user.', 'mongod --version\nmongosh --quiet --eval "db.adminCommand({listDatabases:1})"\nmongodump --archive=/backup/ttfood/mongo-$(date +%F).archive --gzip'],
      ['MinIO object storage', 'Lưu media/product/blog/slider; public qua minio.tranthaifood.com.', 'minio --version\nss -lntp | grep -E ":9000|:9001"\n# Backup object storage nếu dùng filesystem local: rsync thư mục data MinIO sang /backup/ttfood/minio/'],
      ['Nginx + Certbot', 'Proxy frontend, API và MinIO qua HTTPS Let\'s Encrypt.', 'sudo nginx -t\nsudo systemctl reload nginx\nsudo certbot certificates | grep -E "tranthaifood|api.tranthaifood|minio.tranthaifood"'],
      ['Monitoring agents', 'Máy có node_exporter và promtail để gửi metric/log.', 'systemctl status prometheus-node-exporter promtail --no-pager\ncurl -s http://127.0.0.1:9100/metrics | head']
    ],
    overview: [
      'Máy TTFOOD chạy Ubuntu 24.04.3 LTS, SSH custom port 24700, Nginx public 80/443, Tailscale, node_exporter và promtail.',
      'Frontend production ở /var/www/ttfood/frontend, GitLab repo code_bank/ttfood/frontend, branch đang dùng dev/main, Next.js 15.5.9.',
      'Backend production ở /var/www/ttfood/backend, GitLab repo code_bank/ttfood/backend, branch dev/main, NestJS 11, TypeORM MongoDB, JWT, Swagger và Socket.IO.',
      'PM2 có 2 process chính: ttfood-backend chạy /var/www/ttfood/backend/dist/main.js port 8080 và ttfood-frontend chạy npm run start port 3000; cả hai online khoảng 15 ngày, restart count 0.',
      'MongoDB 7.0.26 đang listen 27017; MinIO RELEASE.2025-09-07 đang chạy 9000/9001; Nginx proxy MinIO qua minio.tranthaifood.com.',
      'Domain public gồm tranthaifood.vn, tranthaifood.com, api.tranthaifood.vn, api.tranthaifood.com và minio.tranthaifood.com với certificate Let\'s Encrypt.',
      'Frontend CSP đã cấu hình trong next.config.ts, cho phép API, WebSocket và ảnh từ MinIO/API domain.'
    ],
    env: `# Backend env hiện được code đọc từ: /var/www/ttfood/backend/.env.example\n# Nếu chuẩn hóa production, nên chuyển sang .env và đổi ConfigModule envFilePath cho rõ ràng.\n\nMONGO_USERNAME=<redacted>\nMONGO_PW=<redacted>\nMONGO_HOST=<redacted>\nMONGO_PORT=27017\nMONGO_DB=<redacted>\nCORS_ORIGIN=<redacted>\nNODE_ENV=production\nPORT=8080\nHOST=<redacted>\nJWT_SECRET=<redacted>\nJWT_EXPIRES_IN=<redacted>\nMINIO_ENDPOINT=<redacted>\nMINIO_PORT=9000\nMINIO_ROOT_USER=<redacted>\nMINIO_ROOT_PASSWORD=<redacted>\nMINIO_BUCKET=ttfood\nTIME_EXPIRE=<redacted>\nMINIO_PUBLIC_DOMAIN=https://minio.tranthaifood.com\n\n# Frontend env production đã thấy bản tham chiếu ở /opt/remote_fix/frontend/.env.production:\nNEXT_PUBLIC_API_URL=<redacted>`,
    nginx: `# Frontend HTTPS: /etc/nginx/sites-available/tranthaifood.vn\nserver {\n    listen 80;\n    server_name tranthaifood.vn www.tranthaifood.vn;\n    return 301 https://$host$request_uri;\n}\nserver {\n    listen 443 ssl http2;\n    server_name tranthaifood.vn www.tranthaifood.vn;\n    ssl_certificate /etc/letsencrypt/live/tranthaifood.vn/fullchain.pem;\n    ssl_certificate_key /etc/letsencrypt/live/tranthaifood.vn/privkey.pem;\n    client_max_body_size 20m;\n    location / { proxy_pass http://127.0.0.1:3000; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; proxy_set_header Host $host; }\n    location /_next/static/ { proxy_pass http://127.0.0.1:3000/_next/static/; proxy_set_header Host $host; }\n}\n\n# API HTTPS: /etc/nginx/sites-available/api.tranthaifood.vn\nserver {\n    listen 443 ssl http2;\n    server_name api.tranthaifood.vn www.api.tranthaifood.vn;\n    ssl_certificate /etc/letsencrypt/live/api.tranthaifood.vn/fullchain.pem;\n    ssl_certificate_key /etc/letsencrypt/live/api.tranthaifood.vn/privkey.pem;\n    client_max_body_size 20M;\n    location / { proxy_pass http://127.0.0.1:8080; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection 'upgrade'; proxy_set_header Host $host; }\n}\n\n# MinIO HTTPS: /etc/nginx/sites-available/minio.tranthaifood.com\nserver {\n    listen 443 ssl http2;\n    server_name minio.tranthaifood.com;\n    ssl_certificate /etc/letsencrypt/live/minio.tranthaifood.com/fullchain.pem;\n    ssl_certificate_key /etc/letsencrypt/live/minio.tranthaifood.com/privkey.pem;\n    client_max_body_size 0;\n    proxy_buffering off;\n    proxy_request_buffering off;\n    location / { proxy_pass http://127.0.0.1:9000; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto https; }\n}`,
    cloudflareTunnel: `# Máy này hiện public bằng Nginx + Let\'s Encrypt trực tiếp, chưa thấy cloudflared service.\n# Nếu muốn đưa qua Cloudflare Tunnel, mẫu cấu hình sẽ là:\ntunnel: TUNNEL_UUID\ncredentials-file: /etc/cloudflared/TUNNEL_UUID.json\n\ningress:\n  - hostname: tranthaifood.vn\n    service: http://127.0.0.1:80\n  - hostname: www.tranthaifood.vn\n    service: http://127.0.0.1:80\n  - hostname: api.tranthaifood.vn\n    service: http://127.0.0.1:8080\n  - hostname: minio.tranthaifood.com\n    service: http://127.0.0.1:9000\n  - service: http_status:404`,
    db: `# MongoDB local\nVersion: 7.0.26\nDefault port: 27017\nBackend entities: user, customer_contact, cart_request, catalogue, category, media, product_information, product, slider, blog.\n\n# MinIO object storage\nPorts: 9000 API, 9001 console\nPublic domain: https://minio.tranthaifood.com\nBucket: ttfood\n\n# Backup MongoDB\nsudo mkdir -p /backup/ttfood/$(date +%F)\nmongodump --archive=/backup/ttfood/$(date +%F)/mongo.archive --gzip\n\n# Backup source + Nginx + env reference\nsudo rsync -a --numeric-ids /var/www/ttfood/backend/.env.example /backup/ttfood/$(date +%F)/backend-env.example\nsudo rsync -a --numeric-ids /etc/nginx/sites-available/ /backup/ttfood/$(date +%F)/nginx-sites-available/\npm2 save\n\n# Backup MinIO: xác định data dir/process trước, sau đó rsync hoặc dùng mc mirror.\nps -eo pid,args | grep minio\n# mc alias set local http://127.0.0.1:9000 ACCESS SECRET\n# mc mirror local/ttfood /backup/ttfood/$(date +%F)/minio-ttfood/`,
    deploy: `# Frontend deploy\ncd /var/www/ttfood/frontend\ngit status --short\ngit fetch origin\ngit checkout dev/main\ngit pull --ff-only origin dev/main\nnpm ci\nnpm run build\npm2 restart ttfood-frontend --update-env\n\n# Backend deploy\ncd /var/www/ttfood/backend\ngit status --short\ngit fetch origin\ngit checkout dev/main\ngit pull --ff-only origin dev/main\nnpm ci\nnpm run build\npm2 restart ttfood-backend --update-env\n\n# Reload Nginx + save PM2\nsudo nginx -t\nsudo systemctl reload nginx\npm2 save\n\n# Verify\ncurl -s -o /dev/null -w "front3000:%{http_code}\\n" http://127.0.0.1:3000/\ncurl -s -o /dev/null -w "back8080:%{http_code}\\n" http://127.0.0.1:8080/\ncurl -s -o /dev/null -w "nginxMain:%{http_code}\\n" -H "Host: tranthaifood.vn" http://127.0.0.1/\ncurl -s -o /dev/null -w "nginxApi:%{http_code}\\n" -H "Host: api.tranthaifood.vn" http://127.0.0.1/\ncurl -Ik https://tranthaifood.vn\ncurl -Ik https://api.tranthaifood.vn`,
    checklist: ['Nginx test OK trước reload bằng nginx -t.', 'PM2 restart đúng 2 process: ttfood-frontend và ttfood-backend, sau đó pm2 save.', 'Backup MongoDB trước migration vì TypeORM đang synchronize=true.', 'Backup MinIO bucket ttfood trước khi sửa media/product/blog lớn.', 'MongoDB đang listen 0.0.0.0:27017: cần firewall/allow-list, không để public Internet.', 'MinIO 9000/9001 đang listen rộng: cần chỉ cho phép Nginx/Cloudflare/allow-list hoặc bind nội bộ nếu phù hợp.', 'Không đưa JWT/Mongo/MinIO secret thật vào Git hoặc SetupDev.', 'Theo dõi PM2 logs, Nginx logs, promtail và node_exporter sau deploy.', 'Ổ đĩa / 40G đang dùng khoảng 71%, cần cảnh báo khi vượt 80%.']
  },
  intsoft: {
    id: 'intsoft', name: 'Intsoft / CodeBank', domain: 'codebank.vn', stack: 'Next.js 15 landing + JSON content store + PM2 + Nginx + Cloudflare Tunnel',
    root: '/var/www/frontend', pm2Name: 'frontend', envPath: '/var/www/frontend/.env.local', nginxPath: '/etc/nginx/sites-available/codebank.vn', nginxEnabledPath: '/etc/nginx/sites-enabled/codebank.vn',
    runtime: 'PM2 frontend: npm start, Next.js port 3000, Node.js 24.13.0',
    data: '/var/www/frontend/Data/*.json và /var/www/frontend/Data/image/*',
    links: [['Primary domain', 'https://codebank.vn'], ['Alternate domain', 'https://codebank.com.vn'], ['WWW', 'https://www.codebank.vn'], ['Grafana nội bộ', 'https://grafana.codebank.vn'], ['Backup API nội bộ', 'https://grafana.codebank.vn/backup-api/'], ['GitLab source', 'https://gitlab.com/code_bank/intsoftlanding/frontend.git']],
    tools: [
      ['Next.js 15 runtime', 'Frontend production chạy bằng Next.js 15.5.9 và React 19.2.3.', 'cd /var/www/frontend\nnode -v\nnpm -v\nnpm ci\nnpm run build\npm2 restart frontend --update-env'],
      ['PM2 frontend', 'Process manager đang chạy npm start tại /var/www/frontend.', 'pm2 describe frontend\npm2 logs frontend --lines 120\npm2 restart frontend --update-env\npm2 save'],
      ['Data JSON content', 'Nội dung động lưu dạng JSON và ảnh upload trong thư mục Data.', 'cd /var/www/frontend\nfind Data -type f -maxdepth 3 -printf "%p %s bytes\\n"\ncp -a Data /backup/intsoft/Data-$(date +%F-%H%M%S)'],
      ['Cloudflared tunnel', 'Public domain đi qua Cloudflare Tunnel về Nginx local port 80.', 'sudo systemctl status cloudflared --no-pager\nsudo nano /etc/cloudflared/config.yml\nsudo systemctl restart cloudflared'],
      ['Promtail + node_exporter', 'Máy đã có log collector và exporter cho monitoring.', 'systemctl status promtail node_exporter --no-pager\ncurl -s http://127.0.0.1:9100/metrics | head']
    ],
    overview: [
      'Máy INTSOFT chạy Ubuntu 24.04.3 LTS, SSH custom port 24700, Nginx public 80/443 và Next.js bind port 3000.',
      'Source production nằm tại /var/www/frontend, Git remote là GitLab code_bank/intsoftlanding/frontend.git, branch đang dùng là dev/english.',
      'PM2 process tên frontend chạy /usr/bin/npm start, uptime ổn định, restart count hiện tại bằng 0.',
      'Nginx site codebank.vn reverse proxy về upstream 127.0.0.1:3000, cache immutable riêng cho /_next/static/.',
      'Cloudflare Tunnel route codebank.vn, www.codebank.vn, codebank.com.vn và www.codebank.com.vn về http://127.0.0.1:80.',
      'Nội dung admin/API hiện dùng file JSON trong Data: banner, contacts, partner, stats và ảnh trong Data/image.'
    ],
    env: `# Hiện hệ thống chưa thấy file .env trong /var/www/frontend. Nếu cần cấu hình production, tạo tại:\n# /var/www/frontend/.env.local\n\nNODE_ENV=production\nPORT=3000\nNEXT_PUBLIC_SITE_URL=https://codebank.vn\nNEXT_PUBLIC_ASSET_PREFIX=\nNEXT_PUBLIC_BASE_PATH=\n\n# Không ghi secret thật vào tài liệu. Nếu có API key/SMTP/token, lưu trong .env.local và chmod 600.`,
    nginx: `upstream nextjs_upstream {\n  server 127.0.0.1:3000;\n  keepalive 64;\n}\n\nserver {\n  listen [::]:80;\n  listen 80;\n  server_name codebank.com.vn codebank.vn www.codebank.com.vn www.codebank.vn;\n\n  location /_next/static/ {\n    proxy_pass http://nextjs_upstream;\n    proxy_http_version 1.1;\n    proxy_set_header Host $host;\n    proxy_set_header X-Real-IP $remote_addr;\n    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n    proxy_set_header X-Forwarded-Proto $scheme;\n    expires 365d;\n    add_header Cache-Control "public, immutable";\n  }\n\n  location / {\n    proxy_pass http://nextjs_upstream;\n    proxy_http_version 1.1;\n    proxy_set_header Upgrade $http_upgrade;\n    proxy_set_header Connection "upgrade";\n    proxy_set_header Host $host;\n    proxy_set_header X-Real-IP $remote_addr;\n    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n    proxy_set_header X-Forwarded-Proto $scheme;\n  }\n}`,
    cloudflareTunnel: `# Ghi vào: /etc/cloudflared/config.yml\ntunnel: TUNNEL_UUID\ncredentials-file: /etc/cloudflared/TUNNEL_UUID.json\n\ningress:\n  - hostname: codebank.com.vn\n    service: http://127.0.0.1:80\n  - hostname: www.codebank.com.vn\n    service: http://127.0.0.1:80\n  - hostname: codebank.vn\n    service: http://127.0.0.1:80\n  - hostname: www.codebank.vn\n    service: http://127.0.0.1:80\n  - service: http_status:404\n\n# Vận hành\ncloudflared tunnel list\nsudo systemctl status cloudflared --no-pager\nsudo systemctl restart cloudflared`,
    db: `# Hệ thống hiện không dùng PostgreSQL/MySQL. Data store chính là file JSON + ảnh local.\n/var/www/frontend/Data/banner.json\n/var/www/frontend/Data/contacts.json\n/var/www/frontend/Data/partner.json\n/var/www/frontend/Data/stats.json\n/var/www/frontend/Data/image/banner/*\n/var/www/frontend/Data/image/partner/*\n/var/www/frontend/Data/image/favicon.png\n\n# Backup dữ liệu nội dung\nsudo mkdir -p /backup/intsoft/$(date +%F)\nsudo rsync -a --numeric-ids /var/www/frontend/Data/ /backup/intsoft/$(date +%F)/Data/\nsudo rsync -a --numeric-ids /etc/nginx/sites-available/codebank.vn /backup/intsoft/$(date +%F)/codebank.vn.nginx\nsudo rsync -a --numeric-ids /etc/cloudflared/config.yml /backup/intsoft/$(date +%F)/cloudflared-config.yml\npm2 save`,
    deploy: `cd /var/www/frontend\ngit status --short\ngit fetch origin\ngit checkout dev/english\ngit pull --ff-only origin dev/english\nnpm ci\nnpm run build\npm2 restart frontend --update-env\npm2 save\nsudo nginx -t && sudo systemctl reload nginx\n\n# Verify\ncurl -s -o /dev/null -w "local3000:%{http_code}\\n" http://127.0.0.1:3000/\ncurl -s -o /dev/null -w "nginx80:%{http_code}\\n" -H "Host: codebank.vn" http://127.0.0.1/\ncurl -Ik https://codebank.vn`,
    checklist: ['Nginx codebank.vn test OK trước reload.', 'PM2 frontend restart xong phải pm2 save.', 'Backup thư mục Data trước khi sửa banner/contact/partner/stats.', 'Không commit .env.local hoặc secret vào GitLab.', 'Cloudflare Tunnel route đủ 4 host codebank.vn/codebank.com.vn.', 'Grafana và backup-api chỉ cho phép localhost/Tailscale/Netbird, không mở public.', 'Theo dõi node_exporter, promtail, Nginx log và PM2 log sau deploy.', 'Ổ đĩa / hiện khoảng 20G, cần cảnh báo khi còn trống thấp.']
  },
  mtthanglong: {
    id: 'mtthanglong', name: 'MTThangLong / Enserco', domain: 'enserco.com.vn', stack: 'Next.js landing + NestJS API + MariaDB + PM2 + OpenResty + Cloudflare Tunnel + CrowdSec',
    root: '/var/www/frontend', pm2Name: 'frontend', envPath: '/var/www/frontend/.env.production', nginxPath: '/etc/openresty/sites-available/enserco.com.vn', nginxEnabledPath: '/etc/openresty/sites-enabled/enserco.com.vn',
    runtime: 'PM2: frontend npm start port 3636, webmoitruong-backend node dist/main.js port 8086',
    data: 'MariaDB webmoitruongdv và /var/www/backend/uploads/{banners,news}',
    links: [['Production', 'https://enserco.com.vn'], ['WWW', 'https://www.enserco.com.vn'], ['Frontend local', 'http://127.0.0.1:3636'], ['Backend local', 'http://127.0.0.1:8086'], ['Uploads', 'https://enserco.com.vn/uploads/'], ['Frontend GitLab', 'https://gitlab.com/code_bank/landingpagemtthanglong/frontend.git'], ['Backend GitLab', 'https://gitlab.com/code_bank/landingpagemtthanglong/backend.git']],
    tools: [
      ['OpenResty Nginx', 'Reverse proxy local only, nhận traffic từ Cloudflare Tunnel về 127.0.0.1:80.', 'sudo /usr/local/openresty/nginx/sbin/nginx -t\nsudo /usr/local/openresty/nginx/sbin/nginx -s reload\nps -eo pid,args | grep openresty'],
      ['Next.js frontend', 'Frontend fe-web-pvs-landing chạy Next.js 15.5.12 ở 127.0.0.1:3636.', 'cd /var/www/frontend\nnode -v\nnpm ci\nnpm run build\npm2 restart frontend --update-env'],
      ['NestJS backend', 'Backend webmoitruong chạy NestJS 11, TypeORM, MySQL/MariaDB ở 127.0.0.1:8086.', 'cd /var/www/backend\nnpm ci\nnpm run build\npm2 restart webmoitruong-backend --update-env\npm2 logs webmoitruong-backend --lines 120'],
      ['MariaDB', 'Database local webmoitruongdv chứa admins, banners, contacts, news, statistics.', 'mysql --version\nmysql -u DB_USER -p -e "USE webmoitruongdv; SHOW TABLES;"\nmysqldump -u DB_USER -p webmoitruongdv > /backup/mtthanglong/webmoitruongdv-$(date +%F).sql'],
      ['CrowdSec', 'OpenResty có CrowdSec bouncer/lua để chặn IP xấu.', 'systemctl status crowdsec crowdsec-firewall-bouncer --no-pager\ncscli decisions list\ncscli alerts list -l 20'],
      ['Monitoring agents', 'Máy có node_exporter và promtail cho metrics/log.', 'systemctl status prometheus-node-exporter promtail --no-pager\ncurl -s http://127.0.0.1:9100/metrics | head']
    ],
    overview: [
      'Máy MTThangLong chạy Ubuntu 22.04.2 LTS, SSH custom port 8686, chỉ bind OpenResty ở 127.0.0.1:80 sau Cloudflare Tunnel.',
      'Frontend production ở /var/www/frontend, GitLab repo landingpagemtthanglong/frontend, branch đang dùng dev/main, Next.js 15.5.12, React 19.1.0.',
      'Backend production ở /var/www/backend, GitLab repo landingpagemtthanglong/backend, branch dev/main, NestJS 11, TypeORM, MariaDB.',
      'PM2 có 2 process: frontend và webmoitruong-backend, đều online 16 ngày và restart count hiện tại bằng 0; có pm2-logrotate.',
      'OpenResty route / về frontend 3636, /api/ rewrite sang backend 8086, /uploads/ proxy sang backend static assets.',
      'Cloudflare Tunnel route enserco.com.vn và www.enserco.com.vn về http://127.0.0.1:80; codebank.com.vn bị OpenResty return 404 trên máy này.',
      'Bảo mật hiện có security headers, chặn dotfiles/backup/temp extensions, CrowdSec bouncer, CORS allow-list, ValidationPipe whitelist và rate limit 100 request/phút.'
    ],
    env: `# Frontend env: /var/www/frontend/.env.production\nNEXT_PUBLIC_API_URL=<API URL public, thường là https://enserco.com.vn/api>\n\n# Backend env: /var/www/backend/.env\nDB_HOST=<redacted>\nDB_PORT=<redacted>\nDB_USERNAME=<redacted>\nDB_PASSWORD=<redacted>\nDB_DATABASE=webmoitruongdv\nJWT_SECRET=<redacted>\nJWT_EXPIRES_IN=<redacted>\nPORT=8086\nNODE_ENV=production\nBASE_URL=<redacted>\n\n# Quy tắc: không đưa giá trị thật của DB_PASSWORD/JWT_SECRET lên Git hoặc tài liệu public.`,
    nginx: `# File thật: /etc/openresty/sites-available/enserco.com.vn\n# Symlink: /etc/openresty/sites-enabled/enserco.com.vn\n\nupstream enserco_frontend {\n    server 127.0.0.1:3636;\n    keepalive 32;\n}\n\nupstream enserco_backend {\n    server 127.0.0.1:8086;\n    keepalive 32;\n}\n\nserver {\n    listen 127.0.0.1:80;\n    server_name codebank.com.vn www.codebank.com.vn;\n    return 404;\n}\n\nserver {\n    listen 127.0.0.1:80;\n    server_name enserco.com.vn www.enserco.com.vn;\n\n    set_real_ip_from 127.0.0.1;\n    real_ip_header CF-Connecting-IP;\n    real_ip_recursive on;\n\n    client_max_body_size 50m;\n    large_client_header_buffers 4 8k;\n\n    add_header Strict-Transport-Security "max-age=31536000" always;\n    add_header X-Content-Type-Options "nosniff" always;\n    add_header X-Frame-Options "SAMEORIGIN" always;\n    add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n    add_header Permissions-Policy "accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()" always;\n\n    proxy_hide_header X-Powered-By;\n    more_clear_headers 'X-Powered-By';\n    more_clear_headers 'Server';\n\n    if ($request_method !~ ^(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)$) { return 405; }\n    location ~ /\\.(?!well-known) { deny all; }\n    location ~* \\.(?:bak|old|orig|save|swp|tmp|dist)$ { deny all; }\n\n    proxy_set_header Host $host;\n    proxy_set_header X-Real-IP $remote_addr;\n    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n    proxy_set_header X-Forwarded-Proto https;\n    proxy_http_version 1.1;\n\n    location /api/ { rewrite ^/api/?(.*)$ /$1 break; proxy_pass http://enserco_backend; }\n    location /uploads/ { proxy_pass http://enserco_backend; }\n    location / { proxy_pass http://enserco_frontend; }\n}`,
    cloudflareTunnel: `# Ghi vào: /etc/cloudflared/config.yml\ntunnel: TUNNEL_UUID\ncredentials-file: /etc/cloudflared/TUNNEL_UUID.json\n\noriginRequest:\n  connectTimeout: 10s\n  keepAliveTimeout: 10s\n  tcpKeepAlive: 30s\n  keepAliveConnections: 16\n\ningress:\n  - hostname: enserco.com.vn\n    service: http://127.0.0.1:80\n  - hostname: www.enserco.com.vn\n    service: http://127.0.0.1:80\n  - service: http_status:404\n\n# Vận hành\ncloudflared tunnel list\nsudo systemctl status cloudflared --no-pager\nsudo systemctl restart cloudflared`,
    db: `# MariaDB local\nDatabase: webmoitruongdv\nTables: admins, banners, contacts, news, statistics\nCurrent observed rows: contacts=4, others=0 tại thời điểm rà soát.\n\n# Backup database + upload\nsudo mkdir -p /backup/mtthanglong/$(date +%F)\nset -a; . /var/www/backend/.env; set +a\nmysqldump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USERNAME" -p"$DB_PASSWORD" "$DB_DATABASE" > /backup/mtthanglong/$(date +%F)/webmoitruongdv.sql\nsudo rsync -a --numeric-ids /var/www/backend/uploads/ /backup/mtthanglong/$(date +%F)/uploads/\nsudo rsync -a --numeric-ids /etc/openresty/sites-available/enserco.com.vn /backup/mtthanglong/$(date +%F)/enserco.openresty.conf\nsudo rsync -a --numeric-ids /etc/cloudflared/config.yml /backup/mtthanglong/$(date +%F)/cloudflared-config.yml`,
    deploy: `# Frontend deploy\ncd /var/www/frontend\ngit status --short\ngit fetch origin\ngit checkout dev/main\ngit pull --ff-only origin dev/main\nnpm ci\nnpm run build\npm2 restart frontend --update-env\n\n# Backend deploy\ncd /var/www/backend\ngit status --short\ngit fetch origin\ngit checkout dev/main\ngit pull --ff-only origin dev/main\nnpm ci\nnpm run build\npm2 restart webmoitruong-backend --update-env\n\n# Reload OpenResty + save PM2\nsudo /usr/local/openresty/nginx/sbin/nginx -t\nsudo /usr/local/openresty/nginx/sbin/nginx -s reload\npm2 save\n\n# Verify\ncurl -s -o /dev/null -w "frontend3636:%{http_code}\\n" http://127.0.0.1:3636/\ncurl -s -o /dev/null -w "backend8086:%{http_code}\\n" http://127.0.0.1:8086/\ncurl -s -o /dev/null -w "openresty80:%{http_code}\\n" -H "Host: enserco.com.vn" http://127.0.0.1/\ncurl -Ik https://enserco.com.vn`,
    checklist: ['OpenResty test OK trước reload bằng /usr/local/openresty/nginx/sbin/nginx -t.', 'Backup MariaDB webmoitruongdv trước migration vì TypeORM đang synchronize=true.', 'Backup /var/www/backend/uploads trước khi sửa banner/news media.', 'PM2 restart đúng 2 process: frontend và webmoitruong-backend, sau đó pm2 save.', 'Cloudflare Tunnel chỉ route enserco.com.vn/www về local 127.0.0.1:80.', 'Không public MariaDB, backend và frontend port ra ngoài; hiện đều bind 127.0.0.1.', 'Theo dõi CrowdSec decisions, OpenResty log, PM2 log, promtail và node_exporter sau deploy.', 'Ổ đĩa / 16G đang dùng khoảng 69%, cần cảnh báo và dọn log/upload cũ khi vượt 80%.']
  }
};

const nginxPath = (p) => p.nginxPath || (p.id === 'sentinel' ? '/etc/nginx/sites-available/webdemo.name.vn' : `/etc/nginx/sites-available/${p.id}`);
const nginxEnabledPath = (p) => p.nginxEnabledPath || (p.id === 'sentinel' ? '/etc/nginx/sites-enabled/webdemo.name.vn' : `/etc/nginx/sites-enabled/${p.id}`);
const envPath = (p) => p.envPath || (p.id === 'sentinel' ? '/etc/landingpage/lead-api.env' : `${p.root}/.env`);
const pm2Name = (p) => p.pm2Name || (p.id === 'sentinel' ? 'sentinel-api' : p.id);
const cloudflareTunnel = (p) => p.cloudflareTunnel || `# Ghi vào: /etc/cloudflared/config.yml\ntunnel: TUNNEL_UUID\ncredentials-file: /etc/cloudflared/TUNNEL_UUID.json\n\ningress:\n  - hostname: ${p.domain}\n    service: ${p.id === 'sentinel' ? 'http://127.0.0.1:80' : 'http://127.0.0.1:3000'}\n  - hostname: www.${p.domain}\n    service: ${p.id === 'sentinel' ? 'http://127.0.0.1:80' : 'http://127.0.0.1:3000'}\n  - service: http_status:404\n\ncloudflared tunnel login\ncloudflared tunnel create ${p.domain.replace(/\./g, '-')}\ncloudflared tunnel route dns ${p.domain.replace(/\./g, '-')} ${p.domain}\ncloudflared tunnel route dns ${p.domain.replace(/\./g, '-')} www.${p.domain}\nsudo cloudflared service install\nsudo systemctl enable --now cloudflared`;
const bootstrap = (p) => `# Chạy trên server Ubuntu/Debian mới\nsudo apt update && sudo apt -y upgrade\nsudo apt -y install curl wget git unzip ca-certificates gnupg lsb-release nginx ufw fail2ban htop iotop sysstat\ncurl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -\nsudo apt -y install nodejs\nsudo npm i -g pm2\n\nsudo mkdir -p "${p.root}"\ncd "${p.root}"\n# git clone REPO_URL .\n\n# Ghi env\nsudo nano ${envPath(p)}\nsudo chmod 600 ${envPath(p)}\n\n# Ghi Nginx\nsudo nano ${nginxPath(p)}\nsudo ln -sf ${nginxPath(p)} ${nginxEnabledPath(p)}\nsudo nginx -t && sudo nginx -s reload\n\n# Start runtime\n${p.id === 'sentinel' ? `pm2 serve "${p.root}" 3000 --name sentinel-web --spa\npm2 start /bin/bash --name sentinel-api -- -lc 'cd "${p.root}" && set -a && . /etc/landingpage/lead-api.env && set +a && exec node server/lead-api.js'` : `npm ci --omit=dev\nnpm run build\npm2 start npm --name ${pm2Name(p)} -- start`}\npm2 save\npm2 startup\n\n# Verify\ncurl -Ik https://${p.domain}\ncurl -sS https://${p.domain}/health`;
const pathGuide = (p) => [
  ['Source code / webroot', p.root, `sudo mkdir -p "${p.root}"\ncd "${p.root}"`],
  ['Nginx site config', nginxPath(p), `sudo nano ${nginxPath(p)}\nsudo ln -sf ${nginxPath(p)} ${nginxEnabledPath(p)}\nsudo nginx -t\nsudo nginx -s reload`],
  ['Environment file', envPath(p), `sudo nano ${envPath(p)}\nsudo chmod 600 ${envPath(p)}\npm2 reload ${pm2Name(p)} --update-env`],
  ['Cloudflare tunnel config', '/etc/cloudflared/config.yml', 'sudo nano /etc/cloudflared/config.yml\nsudo cloudflared service install\nsudo systemctl enable --now cloudflared'],
  ['Backup directory', `/backup/${p.id}`, `sudo mkdir -p /backup/${p.id}/$(date +%F)`],
  ['Data/upload storage', p.data, p.id === 'sentinel' ? `sudo mkdir -p "${ROOT}/data" /var/lib/monitoring-lite/storage-site` : `sudo mkdir -p /var/lib/${p.id}/uploads`],
  ['PM2 logs', p.id === 'sentinel' ? '/root/.pm2/logs/sentinel-*' : `/root/.pm2/logs/${pm2Name(p)}-*`, `pm2 logs ${pm2Name(p)} --lines 120`],
  ['Nginx logs', '/var/log/nginx/access.log và /var/log/nginx/error.log', 'sudo tail -120 /var/log/nginx/error.log\nsudo tail -120 /var/log/nginx/access.log']
];
const table = (headers, rows) => `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const pathNote = (label, path) => `<div class="path-note"><strong>${label}</strong><span>${esc(path)}</span></div>`;
const section = (id, title, body) => `<section class="section" id="${id}" data-title="${title.toLowerCase()}"><div class="section-head"><div><p class="eyebrow">${id}</p><h3>${title}</h3></div><button class="section-toggle" type="button">Thu gọn</button></div><div class="section-body">${body}</div></section>`;
const renderTools = (p) => table(['Công cụ cần tải/cài', 'Dùng để làm gì', 'Lệnh tải/cài trên server'], [...baseTools, ...p.tools].map((r) => [`<strong>${r[0]}</strong>`, r[1], code(r[2])]))
const render = (id) => {
  const p = projects[id];
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.project === id));
  output.innerHTML = `<div class="project-head"><div><p class="eyebrow">${p.stack}</p><h2>${p.name}</h2><p>${p.domain} - ${p.runtime}</p></div><a class="btn" href="https://${p.domain}" target="_blank" rel="noopener">Mở site</a></div>
  <div class="badge-grid"><div class="stat-card"><span>Domain</span><strong>${p.domain}</strong></div><div class="stat-card"><span>Webroot</span><strong>${p.root}</strong></div><div class="stat-card"><span>Runtime</span><strong>${p.runtime}</strong></div><div class="stat-card"><span>Data</span><strong>${p.data}</strong></div></div>
  ${section('paths', 'Đường dẫn cấu hình quan trọng', table(['Hạng mục', 'Đường dẫn / nơi cấu hình', 'Lệnh tạo/sửa/kiểm tra'], pathGuide(p).map((r) => [`<strong>${r[0]}</strong>`, `<code>${esc(r[1])}</code>`, code(r[2])]))) }
  ${section('overview', 'Tổng quan hệ thống', `<div class="grid-2">${p.overview.map((x) => `<div class="mini-card"><h4>${x.split('.')[0]}</h4><p>${x}</p></div>`).join('')}</div>`) }
  ${section('links', 'Link tải/cài công cụ lên server', renderTools(p)) }
  ${section('bootstrap', 'Script triển khai tổng từ server trống', pathNote('Chạy theo thứ tự trên server:', p.root) + code(bootstrap(p))) }
  ${section('routes', 'Đường dẫn sau khi triển khai', `<div class="link-list">${p.links.map((l) => `<a href="${l[1]}" target="_blank" rel="noopener"><span>${l[0]}</span><small>${l[1]}</small></a>`).join('')}</div>`) }
  ${section('nginx', 'File config Nginx', pathNote('Ghi cấu hình này vào:', nginxPath(p)) + code(p.nginx) + code(`sudo ln -sf ${nginxPath(p)} ${nginxEnabledPath(p)}\nsudo nginx -t\nsudo nginx -s reload`)) }
  ${section('cloudflare', 'Cloudflare / DNS / WAF / Tunnel', pathNote('Cấu hình DNS/WAF trên Cloudflare Dashboard, tunnel file tại:', '/etc/cloudflared/config.yml') + code(`DNS:\nA ${p.domain} SERVER_PUBLIC_IP\nCNAME www ${p.domain}\n\nSSL/TLS: Full hoặc Full strict\nAlways Use HTTPS: On\nBypass cache: /api*, /admin*, /login*, /storagesit*\nWAF challenge: /admin và /login nếu cần`) + code(cloudflareTunnel(p))) }
  ${section('env', 'Biến môi trường production', pathNote('Ghi file env vào:', envPath(p)) + code(p.env) + code(`sudo chmod 600 ${envPath(p)}\npm2 reload ${pm2Name(p)} --update-env`)) }
  ${section('database', 'Database và dữ liệu', pathNote('Vị trí dữ liệu/backup:', p.data) + code(p.db)) }
  ${section('deploy', 'Deploy, reload, verify', pathNote('Chạy deploy tại:', p.root) + code(p.deploy)) }
  ${section('security', 'Checklist bảo mật và vận hành', table(['#', 'Hạng mục', 'Trạng thái'], p.checklist.map((c, i) => [String(i + 1).padStart(2, '0'), c, `<label><input type="checkbox" data-check="${p.id}-${i}"> Đã kiểm tra</label>`]))) }
  ${section('rollback', 'Rollback nhanh', pathNote('Chạy rollback tại:', p.root) + code(`cd "${p.root}"\ngit log --oneline -10\npm2 list\ngit checkout RELEASE_TAG_OR_COMMIT\nnpm ci --omit=dev || true\nnpm run build || true\npm2 reload ${p.id === 'sentinel' ? 'sentinel-web && pm2 reload sentinel-api' : pm2Name(p)}\nsudo nginx -t && sudo nginx -s reload\ncurl -Ik https://${p.domain}`)) }`;
  installSectionToggles();
  // installDragScroll(); // Removed: tables auto-adjust, no drag-scroll needed
  renderQuick();
  restoreChecks();
};

const installDragScroll = () => {}; // Removed: tables auto-adjust, no drag-scroll needed

const installSectionToggles = () => document.querySelectorAll('.section-toggle').forEach((button) => {
  button.onclick = () => {
    const body = button.closest('.section').querySelector('.section-body');
    body.classList.toggle('hidden');
    button.textContent = body.classList.contains('hidden') ? 'Mở' : 'Thu gọn';
  };
});
const renderQuick = () => {
  quickList.innerHTML = '';
  document.querySelectorAll('.section').forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span> ${item.querySelector('h3').textContent}`;
    button.onclick = () => { item.scrollIntoView({ behavior: 'smooth', block: 'start' }); item.classList.add('highlight'); setTimeout(() => item.classList.remove('highlight'), 1600); };
    quickList.appendChild(button);
  });
};
const restoreChecks = () => document.querySelectorAll('[data-check]').forEach((input) => {
  const key = `setupdev:${input.dataset.check}`;
  input.checked = localStorage.getItem(key) === '1';
  input.onchange = () => localStorage.setItem(key, input.checked ? '1' : '0');
});
tabs.forEach((tab) => tab.addEventListener('click', () => render(tab.dataset.project)));
document.addEventListener('dblclick', async (event) => {
  const pre = event.target.closest('pre');
  if (!pre) return;
  try { await navigator.clipboard.writeText(pre.querySelector('code')?.textContent.trim() || ''); pre.classList.add('copy-focus'); setTimeout(() => pre.classList.remove('copy-focus'), 1200); showToast('Đã copy.'); } catch (_error) { showToast('Không copy được tự động.'); }
});
document.getElementById('expand-all')?.addEventListener('click', () => document.querySelectorAll('.section-body').forEach((item) => item.classList.remove('hidden')));
document.getElementById('collapse-all')?.addEventListener('click', () => document.querySelectorAll('.section-body').forEach((item) => item.classList.add('hidden')));
document.getElementById('setup-search')?.addEventListener('input', (event) => {
  const query = event.target.value.trim().toLowerCase();
  document.querySelectorAll('.section').forEach((sectionEl) => sectionEl.classList.toggle('hidden', Boolean(query) && !sectionEl.textContent.toLowerCase().includes(query)));
});
try { render('sentinel'); } catch (error) { output.innerHTML = `<section class="section"><p class="eyebrow">Render error</p><h3>Không tải được SetupDev</h3><p>${esc(error.message || error)}</p></section>`; }
