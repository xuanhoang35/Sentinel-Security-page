(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const toast = (message) => {
    const box = $('#toast');
    if (!box) return;
    box.textContent = message;
    box.classList.add('show');
    window.setTimeout(() => box.classList.remove('show'), 1900);
  };
  const copyText = async (text) => {
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const helper = document.createElement('textarea');
        helper.value = text;
        helper.style.cssText = 'position:fixed;opacity:0';
        document.body.append(helper);
        helper.select();
        if (!document.execCommand('copy')) throw new Error('copy');
        helper.remove();
      }
      toast('Đã copy toàn bộ quy trình.');
    } catch (_error) { toast('Không thể copy tự động.'); }
  };
  const openModule = (id) => {
    const tab = $(`.module-tab[data-module="${id}"]`);
    tab?.closest('details')?.setAttribute('open', '');
    tab?.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const diagnosis = {
    web: { title: 'Website không truy cập được', modules: ['fixwebedge', 'fixnetwork', 'fixhealth'], steps: [
      ['Xác nhận phạm vi', 'Kiểm tra từ máy ngoài, mã HTTP, DNS và thời gian phản hồi.', 'date -Is\ndig +short A DOMAIN @1.1.1.1\ncurl -sSIk --connect-timeout 8 https://DOMAIN'],
      ['Kiểm tra edge và TLS', 'Xem request có qua Cloudflare, cert còn hạn và hostname đúng.', 'curl -sSIk https://DOMAIN | grep -iE "^HTTP|server:|cf-ray:|cf-cache-status:"\nopenssl s_client -connect DOMAIN:443 -servername DOMAIN </dev/null 2>/dev/null | openssl x509 -noout -dates -subject'],
      ['Kiểm tra origin', 'Xác minh Nginx, port 80/443 và config hợp lệ.', 'sudo nginx -t\nsystemctl status nginx --no-pager -l\nsudo ss -ltnp | grep -E ":80|:443"\nsudo tail -150 /var/log/nginx/error.log'],
      ['Kiểm tra upstream', 'Gọi thẳng health endpoint và đọc log app trước khi restart.', 'curl -v http://127.0.0.1:APP_PORT/health\nsystemctl status APP_SERVICE --no-pager -l\njournalctl -u APP_SERVICE -b -n 200 --no-pager']
    ]},
    gateway: { title: 'Lỗi 502 hoặc 504', modules: ['fixwebedge', 'fixcontainer', 'fixresource'], steps: [
      ['Đọc error log', 'Xác định connection refused, timeout hay socket permission.', 'sudo tail -250 /var/log/nginx/error.log\nsudo nginx -T | grep -nE "proxy_pass|upstream|fastcgi_pass"'],
      ['Probe upstream', 'Gọi đúng IP/port/socket từ chính Nginx host.', 'sudo ss -ltnp\ncurl -v --connect-timeout 5 http://127.0.0.1:APP_PORT/health\nnamei -l /run/APP.sock'],
      ['Kiểm tra runtime', 'Đọc service/container state, exit code và OOM.', 'systemctl status APP_SERVICE --no-pager -l\ndocker ps -a\ndocker logs --tail=250 CONTAINER\ndocker inspect CONTAINER --format "OOM={{.State.OOMKilled}} Exit={{.State.ExitCode}}"'],
      ['Khôi phục và verify', 'Rollback/restart đúng thành phần rồi xác minh từ origin tới public.', 'curl -fsS http://127.0.0.1:APP_PORT/health\nsudo nginx -t && sudo systemctl reload nginx\ncurl -sSIk https://DOMAIN']
    ]},
    resource: { title: 'CPU, RAM hoặc disk cao', modules: ['fixresource', 'fixobserve'], steps: [
      ['Chụp tổng quan', 'Phân biệt CPU, I/O wait, RAM, disk và inode.', 'uptime\nfree -h\ndf -hT\ndf -ih\nvmstat 1 5'],
      ['Tìm thủ phạm', 'Xếp process theo CPU/RAM và kiểm tra I/O.', 'ps aux --sort=-%cpu | head -25\nps aux --sort=-%mem | head -25\niostat -xz 1 5\npidstat -dru 1 5'],
      ['Tìm OOM/log lớn', 'Đọc kernel OOM, deleted file và journal usage.', 'journalctl -k -g "Out of memory|Killed process" --since "24 hours ago"\nsudo lsof +L1\njournalctl --disk-usage\nsudo du -xhd1 /var | sort -h'],
      ['Giảm ảnh hưởng', 'Rate-limit, scale hoặc restart đúng process; ghi lại metric trước/sau.', 'date -Is\ndocker stats --no-stream\nsystemd-cgtop --iterations=1']
    ]},
    ssh: { title: 'Không SSH được', modules: ['fixsecurity', 'fixnetwork'], steps: [
      ['Kiểm tra đường mạng', 'Phân biệt DNS, timeout và refused.', 'getent hosts HOST\nnc -vz HOST 22\ntailscale status\ntailscale ping HOST'],
      ['Đọc client debug', 'Xem key nào được gửi và server từ chối ở bước nào.', 'ssh -vvv USER@HOST'],
      ['Kiểm tra server', 'Qua console/VPN: kiểm tra sshd, config, port và auth log.', 'sudo sshd -t\nsystemctl status ssh --no-pager -l\nsudo ss -ltnp | grep :22\njournalctl -u ssh -b -n 200 --no-pager'],
      ['Kiểm tra block', 'Xem firewall, CrowdSec và Fail2ban có chặn IP quản trị không.', 'sudo ufw status numbered\nsudo cscli decisions list --ip YOUR_IP\nsudo fail2ban-client status sshd\nsudo nft list ruleset | grep -iE "drop|reject|crowdsec" -C 2']
    ]},
    crowdsec: { title: 'CrowdSec không chạy hoặc không chặn', modules: ['fixsecurity', 'fixobserve'], steps: [
      ['Kiểm tra engine', 'Xem trạng thái, journal và acquisition metrics.', 'systemctl status crowdsec --no-pager -l\njournalctl -u crowdsec -b -n 250 --no-pager\nsudo cscli metrics'],
      ['Kiểm tra detection', 'Xem alert, decision và collection đã cài.', 'sudo cscli alerts list\nsudo cscli decisions list\nsudo cscli collections list\nsudo cscli hub list'],
      ['Kiểm tra bouncer', 'Decision có nhưng không block thường nằm ở bouncer/firewall.', 'systemctl status crowdsec-firewall-bouncer --no-pager -l\njournalctl -u crowdsec-firewall-bouncer -b -n 200 --no-pager\nsudo cscli bouncers list\nsudo nft list ruleset | grep -i crowdsec -C 3'],
      ['Kiểm tra log nguồn', 'Xác nhận CrowdSec thực sự đọc access/auth log đang có dữ liệu.', 'sudo tail -80 /var/log/crowdsec.log 2>/dev/null\nsudo tail -80 /var/log/nginx/access.log\nsudo tail -80 /var/log/auth.log 2>/dev/null']
    ]},
    database: { title: 'Database chậm hoặc mất kết nối', modules: ['fixdata', 'fixresource', 'fixobserve'], steps: [
      ['Probe dịch vụ', 'Phân biệt service chết, auth lỗi và port không listen.', 'pg_isready 2>/dev/null || true\nmysqladmin ping 2>/dev/null || true\nredis-cli ping 2>/dev/null || true\nsudo ss -ltnp | grep -E ":5432|:3306|:6379"'],
      ['Đọc log', 'Lấy journal và đường error log do database khai báo.', 'journalctl -u postgresql -u mysql -u redis-server -b -n 250 --no-pager\nsudo -u postgres psql -c "show log_directory; show log_filename;"\nmysql -NBe "select @@log_error;"'],
      ['Tìm lock/query', 'Xác định connection, wait event, lock và slow query.', 'sudo -u postgres psql -c "select state,count(*) from pg_stat_activity group by 1;"\nsudo -u postgres psql -c "select pid,wait_event,now()-query_start age,left(query,120) from pg_stat_activity where state<>\x27idle\x27 order by query_start;"\nmysql -e "show full processlist;"'],
      ['Kiểm tra tài nguyên', 'Database thường chậm do disk, RAM hoặc connection pool.', 'free -h\ndf -h\niostat -xz 1 5\nps aux --sort=-%mem | head -20']
    ]},
    backup: { title: 'Backup không chạy hoặc không restore được', modules: ['fixbackup', 'fixdata'], steps: [
      ['Kiểm tra lịch', 'Xác nhận timer/cron và lần chạy gần nhất.', 'systemctl list-timers --all\njournalctl -u backup.service --since "7 days ago" --no-pager\ncrontab -l\ngrep CRON /var/log/syslog | tail -100'],
      ['Kiểm tra đích', 'Mount, dung lượng, inode và quyền ghi.', 'findmnt /backup\ndf -h /backup\ndf -ih /backup\nnamei -l /backup\nfind /backup -type f -mtime -2 -ls | head -50'],
      ['Kiểm tra integrity', 'Xác nhận checksum và cấu trúc archive/dump.', 'sha256sum -c /backup/SHA256SUMS\ngzip -t /backup/site.tar.gz\ntar -tzf /backup/site.tar.gz | head\npg_restore --list /backup/database.dump | head'],
      ['Restore test', 'Khôi phục vào môi trường tách biệt và đo RTO.', 'mkdir -p /restore-test\ntar -xzf /backup/site.tar.gz -C /restore-test\nfind /restore-test -maxdepth 2 -type f | head']
    ]}
  };

  const riskFor = (text) => {
    if (/\b(rm\s+-rf|mkfs\.|dd\s+if=|iptables\s+-F|nft\s+flush|ufw\s+reset|docker\s+system\s+prune|kubectl\s+delete|DROP\s+DATABASE|TRUNCATE\s+TABLE|shutdown|reboot|pg_restore\s+-d\s+\S+|mysql\s+\S+\s*<)\b/i.test(text)) return ['danger', 'Nguy hiểm'];
    if (/\b(restart|reload|renew|rollout\s+undo|decisions\s+delete|terminate|kill|vacuum|restore|systemctl\s+(start|stop)|ufw\s+(allow|deny))\b/i.test(text)) return ['change', 'Thay đổi'];
    return ['read', 'Chỉ đọc'];
  };

  const installCommandColumnGeometry = () => {
    $$('.master-table').forEach((table) => {
      if (table.dataset.opsColumns === '1') return;
      const headerCount = table.tHead?.rows[0]?.cells.length || 0;
      const sampleRow = [...(table.tBodies[0]?.rows || [])].find((row) => row.querySelector('pre code'));
      if (headerCount < 3 || !sampleRow || sampleRow.cells.length !== headerCount) return;
      const commandIndex = [...sampleRow.cells].findIndex((cell) => cell.querySelector('pre code'));
      if (commandIndex < 0) return;

      const widths = Array(headerCount).fill(0);
      const firstWidth = headerCount >= 5 ? 9 : 10;
      const commandWidth = headerCount >= 5 ? 50 : headerCount === 4 ? 54 : 60;
      const lastIndex = headerCount - 1;
      const lastWidth = commandIndex === lastIndex ? 0 : (headerCount >= 5 ? 13 : headerCount === 4 ? 20 : 0);
      widths[0] = firstWidth;
      widths[commandIndex] = commandWidth;
      if (lastWidth) widths[lastIndex] = lastWidth;
      const unassigned = widths.filter((width) => width === 0).length;
      const remaining = 100 - widths.reduce((sum, width) => sum + width, 0);
      widths.forEach((width, index) => { if (!width) widths[index] = remaining / unassigned; });

      table.querySelector(':scope > colgroup[data-ops-columns]')?.remove();
      const group = document.createElement('colgroup');
      group.dataset.opsColumns = '1';
      widths.forEach((width) => {
        const column = document.createElement('col');
        column.style.width = `${width}%`;
        group.append(column);
      });
      table.prepend(group);
      table.classList.add('ops-command-layout');
      table.dataset.opsColumns = '1';
    });
  };

  const installRiskAndCopy = () => {
    $$('pre').forEach((pre) => {
      if (pre.dataset.opsRisk) return;
      pre.dataset.opsRisk = '1';
      const text = pre.querySelector('code')?.textContent?.trim() || '';
      if (!text) return;
      const [level, label] = riskFor(text);
      const bar = document.createElement('div');
      bar.className = 'command-risk-bar';
      bar.innerHTML = `<span class="command-risk ${level}">${label}</span>`;
      pre.before(bar);
    });
    $$('.row-copy-runbook').forEach((button) => button.remove());
  };

  const envFor = (text) => {
    const tags = [];
    if (/ubuntu|debian|apt\b|ufw|auth\.log/i.test(text)) tags.push('debian');
    if (/rhel|rocky|alma|centos|dnf\b|yum\b|firewalld|selinux/i.test(text)) tags.push('rhel');
    if (/docker|compose|containerd|container\b/i.test(text)) tags.push('docker');
    if (/kubernetes|kubectl|\bk8s\b|pod\b|ingress/i.test(text)) tags.push('kubernetes');
    if (/cloudflare|cloudflared|tailscale|tunnel/i.test(text)) tags.push('cloudflare');
    return tags.length ? tags : ['generic'];
  };
  const applyEnvironment = (value) => {
    let shown = 0;
    $$('.module-panel[data-panel^="fix"] .master-table tbody tr').forEach((row) => {
      const tags = envFor(row.textContent);
      row.dataset.opsEnv = tags.join(' ');
      const visible = value === 'all' || tags.includes('generic') || tags.includes(value);
      row.classList.toggle('ops-env-hidden', !visible);
      if (visible) shown += 1;
    });
    $$('.ops-environment').forEach((select) => { select.value = value; });
    $$('.ops-filter-state').forEach((box) => { box.textContent = `Đang hiển thị ${shown} runbook phù hợp`; });
    localStorage.setItem('learnit:ops:environment', value);
  };

  const analyzeOutput = (text, output, summary) => {
    const rules = [
      ['danger', /failed|fatal|critical|panic|segfault|permission denied|connection refused|no space left|out of memory|oom-kill|inactive \(dead\)|timed out|502 bad gateway|504 gateway/i],
      ['warn', /warning|degraded|retry|timeout|denied|unhealthy|disk pressure|not ready|restart/i],
      ['ok', /active \(running\)|syntax is ok|test is successful|healthy|ready|pong|accepting connections|no failed units/i]
    ];
    output.replaceChildren();
    const counts = { danger: 0, warn: 0, ok: 0 };
    (text.split(/\r?\n/) || []).forEach((line) => {
      const span = document.createElement('span');
      span.className = 'ops-analysis-line';
      const match = rules.find(([, pattern]) => pattern.test(line));
      if (match) { span.classList.add(match[0]); counts[match[0]] += 1; }
      span.textContent = line || ' ';
      output.append(span);
    });
    summary.innerHTML = `<span>Nguy hiểm: ${counts.danger}</span><span>Cảnh báo: ${counts.warn}</span><span>Tín hiệu tốt: ${counts.ok}</span>`;
  };

  const workbenchMarkup = () => `<section class="ops-workbench">
    <div class="ops-toolbar"><label>Môi trường đang xử lý<select class="ops-environment"><option value="all">Tất cả môi trường</option><option value="debian">Ubuntu / Debian</option><option value="rhel">RHEL / Rocky / AlmaLinux</option><option value="docker">Docker / Compose</option><option value="kubernetes">Kubernetes</option><option value="cloudflare">Cloudflare / Tunnel / Tailscale</option></select></label><span class="ops-filter-state"></span></div>
    <nav class="ops-tabs"><button class="ops-tab active" data-ops-tab="diagnose">Chẩn đoán triệu chứng</button><button class="ops-tab" data-ops-tab="output">Phân tích output</button><button class="ops-tab" data-ops-tab="incident">Incident & RCA</button></nav>
    <div class="ops-panel active" data-ops-panel="diagnose"><div class="ops-panel-head"><div><p class="eyebrow">Guided triage</p><h3>Chọn triệu chứng đang gặp</h3><p>Thực hiện từ trên xuống và lưu output trước khi thay đổi hệ thống.</p></div></div><div class="ops-diagnose-controls"><label class="ops-field"><span>Triệu chứng</span><select class="ops-symptom">${Object.entries(diagnosis).map(([id, item]) => `<option value="${id}">${item.title}</option>`).join('')}</select></label><button type="button" class="ops-primary ops-start-diagnosis">Bắt đầu chẩn đoán</button></div><div class="ops-steps"></div></div>
    <div class="ops-panel" data-ops-panel="output"><div class="ops-panel-head"><div><p class="eyebrow">Evidence analyzer</p><h3>Dán output lệnh hoặc log</h3><p>Dữ liệu chỉ được xử lý trong trình duyệt; hãy xóa token, cookie và secret trước khi dán.</p></div></div><div class="ops-output-layout"><div><textarea class="ops-output-input" spellcheck="false" placeholder="Dán systemctl status, journalctl, nginx -t, df -h, docker inspect, kubectl describe, cscli metrics..."></textarea><div class="ops-output-actions"><button type="button" class="ops-primary ops-analyze">Phân tích</button><button type="button" class="ops-clear-output">Xóa output</button></div></div><div><div class="ops-analysis-summary"></div><pre class="ops-analysis">Chưa có output để phân tích.</pre></div></div></div>
    <div class="ops-panel" data-ops-panel="incident"><div class="ops-panel-head"><div><p class="eyebrow">Incident workspace</p><h3>Timeline, trạng thái và RCA</h3><p>Bản nháp tự lưu trên trình duyệt này.</p></div></div><div class="ops-incident-grid"><label class="ops-field"><span>Mã incident</span><input data-incident="id" placeholder="INC-2026-001"></label><label class="ops-field"><span>Mức độ</span><select data-incident="severity"><option>P1 - Critical</option><option>P2 - Major</option><option>P3 - Minor</option></select></label><label class="ops-field"><span>Trạng thái</span><select data-incident="status"><option>Chưa kiểm tra</option><option>Đã xác nhận lỗi</option><option>Đang xử lý</option><option>Đã khôi phục</option><option>Cần theo dõi</option><option>Đã viết RCA</option></select></label><label class="ops-field"><span>Dịch vụ ảnh hưởng</span><input data-incident="services" placeholder="Nginx, API, PostgreSQL..."></label><label class="ops-field"><span>Người phụ trách</span><input data-incident="owner" placeholder="Tên hoặc nhóm"></label><label class="ops-field"><span>Thời điểm bắt đầu</span><input data-incident="started" type="datetime-local"></label><label class="ops-field wide"><span>Ảnh hưởng</span><textarea data-incident="impact" placeholder="Ai bị ảnh hưởng, chức năng nào, phạm vi và số liệu..."></textarea></label><label class="ops-field wide"><span>Thêm mốc timeline</span><textarea class="ops-timeline-input" placeholder="Lệnh đã chạy, output chính, quyết định, rollback hoặc kết quả verify..."></textarea></label></div><div class="ops-incident-actions"><button type="button" class="ops-primary ops-add-timeline">Thêm vào timeline</button><button type="button" class="ops-export-md">Xuất Markdown</button><button type="button" class="ops-print-rca">In / lưu PDF</button><button type="button" class="ops-reset-incident">Tạo incident mới</button></div><div class="ops-timeline"></div></div>
  </section>`;

  const incidentKey = 'learnit:ops:incident:v1';
  const loadIncident = () => {
    try { return JSON.parse(localStorage.getItem(incidentKey)) || { fields: {}, timeline: [] }; }
    catch (_error) { return { fields: {}, timeline: [] }; }
  };
  let incident = loadIncident();
  const saveIncident = (root) => {
    $$('[data-incident]', root).forEach((input) => { incident.fields[input.dataset.incident] = input.value; });
    localStorage.setItem(incidentKey, JSON.stringify(incident));
  };
  const incidentMarkdown = () => {
    const f = incident.fields;
    return `# Incident ${f.id || 'chưa đặt mã'}\n\n- Mức độ: ${f.severity || ''}\n- Trạng thái: ${f.status || ''}\n- Dịch vụ: ${f.services || ''}\n- Owner: ${f.owner || ''}\n- Bắt đầu: ${f.started || ''}\n\n## Ảnh hưởng\n\n${f.impact || ''}\n\n## Timeline\n\n${incident.timeline.map((item) => `### ${item.time}\n${item.text}`).join('\n\n')}\n\n## Root cause\n\nChưa cập nhật.\n\n## Khắc phục và phòng tránh\n\nChưa cập nhật.\n`;
  };
  const renderTimeline = (root) => {
    const host = $('.ops-timeline', root);
    host.replaceChildren();
    incident.timeline.forEach((item, index) => {
      const row = document.createElement('article');
      row.className = 'ops-timeline-item';
      const time = document.createElement('time'); time.textContent = item.time;
      const copy = document.createElement('p'); copy.textContent = item.text;
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'ops-timeline-remove'; remove.textContent = 'Xóa';
      remove.addEventListener('click', () => { incident.timeline.splice(index, 1); saveIncident(root); renderTimeline(root); });
      row.append(time, copy, remove); host.append(row);
    });
  };

  const installWorkbench = () => {
    const panel = $('.module-panel[data-panel="fixcenter"]');
    if (!panel || panel.querySelector('.ops-workbench')) return;
    const anchor = panel.querySelector('.module-course-meta') || panel.querySelector('.lead');
    anchor?.insertAdjacentHTML('afterend', workbenchMarkup());
    const root = $('.ops-workbench', panel);
    $$('.ops-tab', root).forEach((button) => button.addEventListener('click', () => {
      $$('.ops-tab', root).forEach((item) => item.classList.toggle('active', item === button));
      $$('.ops-panel', root).forEach((item) => item.classList.toggle('active', item.dataset.opsPanel === button.dataset.opsTab));
    }));
    const renderDiagnosis = () => {
      const item = diagnosis[$('.ops-symptom', root).value];
      const host = $('.ops-steps', root);
      host.innerHTML = item.steps.map((step, index) => `<article class="ops-step"><span class="ops-step-no">${index + 1}</span><div><h4>${step[0]}</h4><p>${step[1]}</p></div><pre><code></code></pre><div class="ops-step-actions"><button type="button" data-copy-step="${index}">Copy bước này</button></div></article>`).join('') + `<div class="ops-related"><button type="button" class="ops-primary ops-copy-diagnosis">Copy toàn bộ quy trình</button>${item.modules.map((id) => `<button type="button" data-open-module="${id}">Mở ${$(`.module-tab[data-module="${id}"] strong`)?.textContent || id}</button>`).join('')}</div>`;
      $$('.ops-step code', host).forEach((code, index) => { code.textContent = item.steps[index][2]; });
      $$('[data-copy-step]', host).forEach((button) => button.addEventListener('click', () => copyText(item.steps[Number(button.dataset.copyStep)][2])));
      $('.ops-copy-diagnosis', host)?.addEventListener('click', () => copyText(`${item.title}\n\n${item.steps.map((step, index) => `${index + 1}. ${step[0]}\n${step[1]}\n${step[2]}`).join('\n\n')}`));
      $$('[data-open-module]', host).forEach((button) => button.addEventListener('click', () => openModule(button.dataset.openModule)));
      installRiskAndCopy();
    };
    $('.ops-start-diagnosis', root)?.addEventListener('click', renderDiagnosis);
    $('.ops-symptom', root)?.addEventListener('change', renderDiagnosis);
    renderDiagnosis();

    $('.ops-analyze', root)?.addEventListener('click', () => analyzeOutput($('.ops-output-input', root).value, $('.ops-analysis', root), $('.ops-analysis-summary', root)));
    $('.ops-clear-output', root)?.addEventListener('click', () => { $('.ops-output-input', root).value = ''; $('.ops-analysis', root).textContent = 'Chưa có output để phân tích.'; $('.ops-analysis-summary', root).replaceChildren(); });

    $$('[data-incident]', root).forEach((input) => { input.value = incident.fields[input.dataset.incident] || input.value; input.addEventListener('input', () => saveIncident(root)); input.addEventListener('change', () => saveIncident(root)); });
    $('.ops-add-timeline', root)?.addEventListener('click', () => { const input = $('.ops-timeline-input', root); if (!input.value.trim()) return toast('Hãy nhập nội dung timeline.'); incident.timeline.push({ time: new Date().toISOString(), text: input.value.trim() }); input.value = ''; saveIncident(root); renderTimeline(root); });
    $('.ops-export-md', root)?.addEventListener('click', () => { saveIncident(root); const blob = new Blob([incidentMarkdown()], { type: 'text/markdown;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${incident.fields.id || 'incident-report'}.md`; link.click(); URL.revokeObjectURL(link.href); });
    $('.ops-print-rca', root)?.addEventListener('click', () => { saveIncident(root); let sheet = $('.ops-print-sheet'); if (!sheet) { sheet = document.createElement('article'); sheet.className = 'ops-print-sheet'; document.body.append(sheet); } sheet.innerHTML = '<h1>Incident / RCA</h1><pre></pre>'; $('pre', sheet).textContent = incidentMarkdown(); document.body.classList.add('ops-printing'); window.print(); window.setTimeout(() => document.body.classList.remove('ops-printing'), 500); });
    $('.ops-reset-incident', root)?.addEventListener('click', () => { if (!confirm('Xóa bản nháp incident hiện tại và tạo bản mới?')) return; incident = { fields: {}, timeline: [] }; localStorage.removeItem(incidentKey); $$('[data-incident]', root).forEach((input) => { input.value = ''; }); renderTimeline(root); });
    renderTimeline(root);

    $$('.ops-environment').forEach((select) => select.addEventListener('change', () => applyEnvironment(select.value)));
    applyEnvironment(localStorage.getItem('learnit:ops:environment') || 'all');
  };

  const relatedMap = {
    fixhealth: ['fixlinux', 'fixwebedge', 'fixobserve'], fixlinux: ['fixresource', 'fixobserve', 'fixsecurity'], fixwebedge: ['fixnetwork', 'fixcontainer', 'fixsecurity'], fixsecurity: ['fixnetwork', 'fixobserve', 'fixwebedge'], fixcontainer: ['fixresource', 'fixnetwork', 'fixdata'], fixdata: ['fixresource', 'fixbackup', 'fixobserve'], fixnetwork: ['fixwebedge', 'fixsecurity', 'fixobserve'], fixresource: ['fixobserve', 'fixlinux', 'fixcontainer'], fixobserve: ['fixhealth', 'fixresource', 'fixbackup'], fixbackup: ['fixdata', 'fixresource', 'fixobserve']
  };
  const installRelatedLinks = () => Object.entries(relatedMap).forEach(([id, links]) => {
    const panel = $(`.module-panel[data-panel="${id}"]`);
    if (!panel || panel.querySelector('.ops-related-panel')) return;
    const box = document.createElement('section'); box.className = 'ops-related-panel'; box.innerHTML = `<h4>Lỗi và runbook liên quan</h4><div class="ops-related"></div>`;
    links.forEach((target) => { const button = document.createElement('button'); button.type = 'button'; button.textContent = $(`.module-tab[data-module="${target}"] strong`)?.textContent || target; button.addEventListener('click', () => openModule(target)); $('.ops-related', box).append(button); });
    (panel.querySelector('.module-course-meta') || panel.querySelector('.lead'))?.insertAdjacentElement('afterend', box);
  });

  installCommandColumnGeometry();
  installWorkbench();
  installRiskAndCopy();
  installRelatedLinks();
})();
