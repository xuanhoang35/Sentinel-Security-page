const toast = document.getElementById('toast');
const showToast = (message) => {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 1800);
};

const moduleTabs = Array.from(document.querySelectorAll('.module-tab'));
const modulePanels = Array.from(document.querySelectorAll('.module-panel'));
const lookupList = document.getElementById('lookup-list');
const lookupSearch = document.getElementById('lookup-search');
const globalSearch = document.getElementById('global-search');
const globalResults = document.getElementById('global-results');
const progressEl = document.getElementById('progress-total');

const rowKey = (row, type) => {
  const panel = row.closest('.module-panel')?.dataset.panel || 'unknown';
  const rows = Array.from(row.closest('tbody')?.querySelectorAll('tr') || []);
  const index = rows.indexOf(row);
  return `learnit:${type}:${panel}:${index}`;
};
const getLookupTarget = (heading) => heading.closest('tr, section, .command-pack, .module-panel') || heading;
const getTargetTitle = (heading) => {
  if (heading.matches('tr')) {
    const cells = heading.querySelectorAll('td');
    return `${cells[0]?.textContent || ''} ${cells[1]?.textContent || ''}`.trim().replace(/\s+/g, ' ');
  }
  return heading.textContent.trim().replace(/\s+/g, ' ');
};
const difficultyFor = (row, index) => {
  const text = row.textContent.toLowerCase();
  if (/production|security|incident|rollback|dr|vault|mesh|policy|ha|hardening/.test(text)) return 'Production';
  if (index > 12 || /advanced|troubleshoot|tuning|debug|scan|backup|restore/.test(text)) return 'Advanced';
  if (index > 5 || /deploy|network|service|database|docker|kubernetes/.test(text)) return 'Intermediate';
  return 'Basic';
};

const enhanceRows = () => {
  for (const panel of modulePanels) {
    const rows = Array.from(panel.querySelectorAll('.master-table tbody tr'));
    rows.forEach((row, index) => {
      if (row.dataset.enhanced) return;
      row.dataset.enhanced = '1';
      const first = row.querySelector('td');
      const second = row.querySelector('td:nth-child(2)');
      if (first) {
        const tools = document.createElement('div');
        tools.className = 'row-tools';
        const done = document.createElement('input');
        done.type = 'checkbox';
        done.className = 'row-done';
        done.title = 'Đánh dấu đã học';
        done.checked = localStorage.getItem(rowKey(row, 'done')) === '1';
        done.addEventListener('change', () => {
          localStorage.setItem(rowKey(row, 'done'), done.checked ? '1' : '0');
          renderProgress();
        });
        const fav = document.createElement('button');
        fav.type = 'button';
        fav.className = 'favorite-toggle';
        fav.title = 'Thêm vào yêu thích';
        fav.textContent = '☆';
        const updateFav = () => {
          const active = localStorage.getItem(rowKey(row, 'fav')) === '1';
          fav.classList.toggle('is-favorite', active);
          fav.textContent = active ? '★' : '☆';
        };
        fav.addEventListener('click', (event) => {
          event.stopPropagation();
          const key = rowKey(row, 'fav');
          localStorage.setItem(key, localStorage.getItem(key) === '1' ? '0' : '1');
          updateFav();
          renderFavorites();
        });
        tools.append(done, fav);
        first.prepend(tools);
        updateFav();
      }
      if (second && !second.querySelector('.difficulty-badge')) {
        const level = difficultyFor(row, index);
        const badge = document.createElement('span');
        badge.className = `difficulty-badge ${level.toLowerCase()}`;
        badge.textContent = level;
        second.prepend(badge);
      }
      if (panel.dataset.panel === 'labs' && first && !first.querySelector('.lab-status')) {
        const select = document.createElement('select');
        select.className = 'lab-status';
        ['Chưa làm', 'Đang làm', 'Xong', 'Cần ôn lại'].forEach((label) => {
          const option = document.createElement('option');
          option.value = label;
          option.textContent = label;
          select.append(option);
        });
        select.value = localStorage.getItem(rowKey(row, 'labstatus')) || 'Chưa làm';
        select.addEventListener('change', () => localStorage.setItem(rowKey(row, 'labstatus'), select.value));
        first.append(select);
      }
      if (row.closest('.lpic-qa-table, .ccna-qa-table')) {
        row.classList.add('qa-hidden');
        row.querySelector('pre')?.addEventListener('click', () => {
          row.classList.toggle('qa-hidden');
          row.classList.toggle('qa-visible');
        });
      }
    });
  }
};

const activateModule = (moduleId) => {
  for (const tab of moduleTabs) {
    const active = tab.dataset.module === moduleId;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-pressed', active ? 'true' : 'false');
  }
  for (const panel of modulePanels) panel.classList.toggle('active', panel.dataset.panel === moduleId);
  localStorage.setItem('learnit:active-module', moduleId);
  renderQuickLookup(moduleId);
  renderProgress();
  renderFavorites();
};

const renderQuickLookup = (moduleId) => {
  if (!lookupList) return;
  const panel = modulePanels.find((item) => item.dataset.panel === moduleId);
  lookupList.innerHTML = '';
  if (!panel) return;
  const headings = Array.from(panel.querySelectorAll('.master-table tbody tr, .lesson-grid h3, .bug-list h3, .command-list h3, .deploy-grid h3, .command-pack h3'));
  const query = lookupSearch?.value.trim().toLowerCase() || '';
  const filtered = headings.filter((heading) => getTargetTitle(heading).toLowerCase().includes(query));
  if (!filtered.length) {
    lookupList.innerHTML = '<p class="lookup-empty">Không tìm thấy mục phù hợp.</p>';
    return;
  }
  filtered.slice(0, 120).forEach((heading, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lookup-item';
    const title = getTargetTitle(heading);
    const label = heading.matches('tr') ? (heading.querySelector('td strong')?.textContent?.trim() || 'Mục') : (heading.closest('section')?.querySelector('span')?.textContent?.trim() || panel.querySelector('.eyebrow')?.textContent?.trim() || 'Mục học');
    button.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><strong>${title}</strong><small>${label}</small>`;
    button.addEventListener('click', () => focusTarget(heading));
    lookupList.appendChild(button);
  });
};
const focusTarget = (target) => {
  const panel = target.closest('.module-panel');
  if (panel) activateModule(panel.dataset.panel);
  window.setTimeout(() => {
    const item = getLookupTarget(target);
    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
    item.classList.remove('lookup-focus');
    void item.offsetWidth;
    item.classList.add('lookup-focus');
    window.setTimeout(() => item.classList.remove('lookup-focus'), 1800);
  }, 80);
};

const renderProgress = () => {
  const allRows = Array.from(document.querySelectorAll('.master-table tbody tr'));
  const done = allRows.filter((row) => localStorage.getItem(rowKey(row, 'done')) === '1').length;
  if (progressEl) progressEl.textContent = `${allRows.length ? Math.round(done / allRows.length * 100) : 0}%`;
  let board = document.querySelector('.module-progress-board');
  if (!board && lookupList?.parentElement) {
    board = document.createElement('section');
    board.className = 'module-progress-board';
    lookupList.parentElement.insertBefore(board, lookupList);
  }
  if (!board) return;
  const lines = modulePanels.map((panel) => {
    const rows = Array.from(panel.querySelectorAll('.master-table tbody tr'));
    if (!rows.length) return '';
    const checked = rows.filter((row) => localStorage.getItem(rowKey(row, 'done')) === '1').length;
    const pct = Math.round(checked / rows.length * 100);
    const name = moduleTabs.find((tab) => tab.dataset.module === panel.dataset.panel)?.querySelector('strong')?.textContent || panel.dataset.panel;
    return `<div class="progress-line"><strong>${name}</strong><span>${pct}%</span><div class="progress-bar"><span style="width:${pct}%"></span></div></div>`;
  }).filter(Boolean).join('');
  board.innerHTML = `<h3>Tiến độ học</h3><div class="progress-list">${lines}</div>`;
};
const renderFavorites = () => {
  let board = document.querySelector('.favorite-board');
  const parent = lookupList?.parentElement;
  if (!board && parent) {
    board = document.createElement('section');
    board.className = 'favorite-board';
    parent.insertBefore(board, document.querySelector('.module-progress-board')?.nextSibling || lookupList);
  }
  if (!board) return;
  const favRows = Array.from(document.querySelectorAll('.master-table tbody tr')).filter((row) => localStorage.getItem(rowKey(row, 'fav')) === '1');
  if (!favRows.length) {
    board.innerHTML = '<h3>Yêu thích</h3><p class="lookup-empty">Chưa có mục yêu thích.</p>';
    return;
  }
  const items = favRows.slice(0, 18).map((row, index) => `<button type="button" class="fav-jump" data-fav-index="${index}"><strong>${getTargetTitle(row)}</strong><small>${row.closest('.module-panel')?.dataset.panel || ''}</small></button>`).join('');
  board.innerHTML = `<h3>Yêu thích</h3><div class="favorite-list">${items}</div>`;
  board.querySelectorAll('.fav-jump').forEach((button) => button.addEventListener('click', () => focusTarget(favRows[Number(button.dataset.favIndex)])));
};

lookupSearch?.addEventListener('input', () => {
  const activeTab = moduleTabs.find((tab) => tab.classList.contains('active'));
  renderQuickLookup(activeTab?.dataset.module || 'linux');
});
for (const tab of moduleTabs) tab.addEventListener('click', () => activateModule(tab.dataset.module));

const copyTextWithFallback = async (text) => {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const helper = document.createElement('textarea');
  helper.value = text;
  helper.setAttribute('readonly', '');
  helper.style.position = 'fixed';
  helper.style.opacity = '0';
  helper.style.pointerEvents = 'none';
  document.body.appendChild(helper);
  helper.select();
  const copied = document.execCommand('copy');
  helper.remove();
  if (!copied) throw new Error('copy-failed');
};

document.addEventListener('dblclick', async (event) => {
  const codeBox = event.target.closest('pre');
  const text = codeBox?.querySelector('code')?.textContent || '';
  if (!text) return;
  try {
    await copyTextWithFallback(text.trim());
    codeBox.classList.remove('copy-focus');
    void codeBox.offsetWidth;
    codeBox.classList.add('copy-focus');
    window.setTimeout(() => codeBox.classList.remove('copy-focus'), 1200);
    showToast('Đã copy lệnh.');
  } catch (_error) { showToast('Không thể copy tự động.'); }
});

globalSearch?.addEventListener('input', () => {
  if (!globalResults) return;
  const query = globalSearch.value.trim().toLowerCase();
  globalResults.innerHTML = '';
  if (!query) { globalResults.classList.remove('show'); return; }
  const rows = Array.from(document.querySelectorAll('.module-panel .master-table tbody tr'));
  const hits = rows.filter((row) => `${row.textContent} ${row.dataset.tags || ''}`.toLowerCase().includes(query)).slice(0, 40);
  if (!hits.length) {
    globalResults.innerHTML = '<p class="lookup-empty">Không tìm thấy.</p>';
  } else {
    hits.forEach((row, index) => {
      const panel = row.closest('.module-panel')?.dataset.panel || '';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'global-result';
      button.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><strong>${getTargetTitle(row)}</strong><small>${panel}</small>`;
      button.addEventListener('click', () => { globalResults.classList.remove('show'); globalSearch.value = ''; focusTarget(row); });
      globalResults.appendChild(button);
    });
  }
  globalResults.classList.add('show');
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.global-search-wrap')) globalResults?.classList.remove('show');
});

const searchInput = document.getElementById('command-search');
const commandCards = Array.from(document.querySelectorAll('#command-list tbody tr, #command-list section'));
searchInput?.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase();
  for (const card of commandCards) {
    const haystack = `${card.textContent} ${card.dataset.tags || ''}`.toLowerCase();
    card.classList.toggle('is-hidden', Boolean(query) && !haystack.includes(query));
  }
});

enhanceRows();
const savedModule = localStorage.getItem('learnit:active-module');
activateModule(moduleTabs.some((tab) => tab.dataset.module === savedModule) ? savedModule : 'linux');

const suiteProfiles = {
  linux: ['User', 'Process', 'Filesystem', 'Network'],
  lpic: ['101-500', 'Commands', 'Filesystem', '102-500'],
  bug: ['Symptom', 'Logs', 'Fix', 'RCA'],
  commands: ['Search', 'Command', 'Copy', 'Apply'],
  docker: ['Image', 'Container', 'Volume', 'Compose'],
  kubernetes: ['Pod', 'Service', 'Ingress', 'Rollout'],
  cicd: ['Commit', 'Build/Test', 'Scan', 'Deploy'],
  monitoring: ['Metrics', 'Logs', 'Alerts', 'Runbook'],
  database: ['Schema', 'Query', 'Backup', 'Restore'],
  nginxweb: ['Client', 'Nginx', 'Upstream', 'TLS'],
  cloud: ['IAM', 'Network', 'Compute', 'Storage'],
  backupdr: ['Backup', 'Verify', 'Offsite', 'Restore'],
  automation: ['Script', 'Validate', 'Run', 'Report'],
  gitops: ['Git', 'Controller', 'Cluster', 'Drift'],
  architecture: ['Entry', 'App', 'Data', 'Observe'],
  labs: ['Start', 'Build', 'Break', 'RCA'],
  terraform: ['Code', 'Plan', 'State', 'Apply'],
  otel: ['Trace', 'Span', 'Collector', 'Backend'],
  mesh: ['Sidecar', 'mTLS', 'Traffic', 'Policy'],
  vault: ['Auth', 'Policy', 'Secret', 'Audit'],
  perf: ['Baseline', 'Profile', 'Tune', 'Measure'],
  emaildns: ['MX', 'SPF/DKIM', 'DMARC', 'Reputation'],
  security: ['Harden', 'Scan', 'Detect', 'Respond'],
  cisco: ['Switch', 'VLAN', 'Router', 'ACL'],
  ccna: ['L2', 'IPv4/IPv6', 'Routing', 'Security'],
  deploy: ['Server', 'Runtime', 'Release', 'Operate'],
};
const suiteSummary = (panel) => {
  const courseCards = Array.from(panel.querySelectorAll('.course-grid section p')).map((item) => item.textContent.trim());
  const rows = Array.from(panel.querySelectorAll('.master-table tbody tr')).slice(0, 6).map(getTargetTitle);
  return { courseCards, rows };
};
const buildDiagram = (nodes) => {
  const safe = nodes.slice(0, 4);
  return `<div class="diagram-stage">${safe.map((node, index) => `<div class="diagram-node"><strong>${index + 1}. ${node}</strong><small>${index === 0 ? 'Điểm bắt đầu' : index === safe.length - 1 ? 'Kết quả vận hành' : 'Lớp xử lý trung gian'}</small></div>`).join('')}</div>`;
};
const buildSvgTopology = (nodes) => {
  const labels = nodes.slice(0, 4);
  const x = [90, 270, 450, 630];
  return `<svg viewBox="0 0 720 260" role="img" aria-label="Topology minh họa"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#10f2a2"/><stop offset="1" stop-color="#18c8ff"/></linearGradient></defs><g fill="none" stroke="rgba(152,169,198,.18)">${x.slice(0,-1).map((n,i)=>`<path d="M${n+52} 130 C ${n+95} 70 ${x[i+1]-95} 190 ${x[i+1]-52} 130"/>`).join('')}</g>${labels.map((label,i)=>`<g transform="translate(${x[i]-58} 82)"><rect width="116" height="96" rx="14" fill="rgba(16,242,162,.09)" stroke="url(#g)"/><text x="58" y="45" fill="#eef5ff" text-anchor="middle" font-size="15" font-weight="800">${label}</text><text x="58" y="66" fill="#9bacca" text-anchor="middle" font-size="11">Layer ${i+1}</text></g>`).join('')}</svg>`;
};
const buildSuite = (panel) => {
  if (panel.querySelector('.deep-suite')) return;
  const moduleId = panel.dataset.panel;
  const tabName = moduleTabs.find((tab) => tab.dataset.module === moduleId)?.querySelector('strong')?.textContent || moduleId;
  const profile = suiteProfiles[moduleId] || ['Input', 'Process', 'Verify', 'Operate'];
  const { courseCards, rows } = suiteSummary(panel);
  const theory = courseCards[0] || `${tabName} cần hiểu nguyên lý, thành phần, dữ liệu đầu vào, cách kiểm tra và rủi ro khi vận hành.`;
  const lab = courseCards[1] || `Dựng lab ${tabName}, cố tình tạo lỗi, kiểm tra log/metric, sửa lỗi và ghi lại runbook.`;
  const question = courseCards[2] || `Bạn phải giải thích được ${tabName} dùng khi nào, lỗi thường gặp là gì, và lệnh kiểm tra đầu tiên là gì.`;
  const incident = courseCards[3] || `Tình huống production: hệ thống lỗi liên quan ${tabName}, cần khoanh vùng, khôi phục, rồi viết RCA.`;
  const quizId = `quiz-${moduleId}`;
  const labKey = `learnit:labflow:${moduleId}`;
  const suite = document.createElement('div');
  suite.className = 'deep-suite';
  suite.innerHTML = `
    <div class="suite-tabs">
      <button type="button" class="suite-tab active" data-suite="chapter">Chương học</button>
      <button type="button" class="suite-tab" data-suite="diagram">Sơ đồ</button>
      <button type="button" class="suite-tab" data-suite="quiz">Quiz</button>
      <button type="button" class="suite-tab" data-suite="lab">Lab workflow</button>
      <button type="button" class="suite-tab" data-suite="case">Case study</button>
      <button type="button" class="suite-tab" data-suite="media">Topology/media</button>
    </div>
    <section class="suite-panel active" data-suite-panel="chapter">
      <div class="chapter-list">
        <article class="chapter-card"><p class="eyebrow">Chapter 01</p><h4>Nắm bản chất ${tabName}</h4><p>${theory}</p><ul><li>Đọc khái niệm trước khi chạy lệnh.</li><li>Vẽ lại luồng hoạt động bằng lời của bạn.</li><li>Ghi lại dấu hiệu khi thành phần này lỗi.</li></ul></article>
        <article class="chapter-card"><p class="eyebrow">Chapter 02</p><h4>Thực hành có kiểm chứng</h4><p>${lab}</p><ul><li>Chuẩn bị môi trường lab tách khỏi production.</li><li>Chạy từng lệnh, ghi input/output.</li><li>Verify bằng log, metric hoặc kết quả cuối.</li></ul></article>
        <article class="chapter-card"><p class="eyebrow">Chapter 03</p><h4>Debug và vận hành</h4><p>${incident}</p><ul><li>Không sửa trước khi xác nhận triệu chứng.</li><li>Thu thập bằng chứng tối thiểu.</li><li>Sửa nhỏ nhất, verify, rồi ghi RCA.</li></ul></article>
      </div>
    </section>
    <section class="suite-panel" data-suite-panel="diagram">${buildDiagram(profile)}</section>
    <section class="suite-panel" data-suite-panel="quiz">
      <article class="quiz-card" id="${quizId}"><h4>Quiz tự chấm: ${tabName}</h4><p>Chọn đáp án đúng nhất rồi bấm chấm điểm.</p>
        ${[
          ['Mục tiêu đầu tiên khi học module này là gì?', 'Hiểu bản chất trước khi chạy lệnh', ['Copy lệnh càng nhanh càng tốt', 'Hiểu bản chất trước khi chạy lệnh', 'Bỏ qua lab', 'Chỉ đọc tiêu đề']],
          ['Khi gặp sự cố production, bước đúng là gì?', 'Xác nhận triệu chứng và thu thập log/metric trước', ['Restart ngay mọi service', 'Xóa log cho sạch', 'Xác nhận triệu chứng và thu thập log/metric trước', 'Đổi cấu hình ngẫu nhiên']],
          ['Làm thế nào để chứng minh đã học xong một mục?', 'Làm lab, verify kết quả và trả lời được câu hỏi cốt lõi', ['Chỉ tick checkbox', 'Chỉ đọc lướt', 'Làm lab, verify kết quả và trả lời được câu hỏi cốt lõi', 'Chỉ xem bảng tra cứu']]
        ].map((q, qi) => `<div class="quiz-question" data-answer="${q[1]}"><h4>Q${qi+1}. ${q[0]}</h4><div class="quiz-options">${q[2].map((op, oi)=>`<label><input type="radio" name="${quizId}-${qi}" value="${op}">${op}</label>`).join('')}</div></div>`).join('')}
        <button type="button" class="quiz-submit">Chấm điểm</button><div class="quiz-result"></div>
      </article>
    </section>
    <section class="suite-panel" data-suite-panel="lab">
      <article class="lab-card"><h4>Lab workflow: ${tabName}</h4><p>${lab}</p><ol><li>Bấm bắt đầu lab và ghi mục tiêu.</li><li>Chạy các lệnh trong bảng master.</li><li>Nộp kết quả: lệnh đã chạy, lỗi gặp, cách verify.</li><li>Bấm kiểm tra để đối chiếu checklist.</li></ol><div class="lab-actions"><button type="button" class="lab-start">Bắt đầu lab</button><button type="button" class="lab-check">Kiểm tra đáp án</button><button type="button" class="lab-reset">Làm lại</button></div><textarea class="lab-submit" placeholder="Ghi kết quả lab, lệnh đã chạy, output chính, lỗi gặp..."></textarea><div class="lab-status-pill">Trạng thái: ${localStorage.getItem(labKey) || 'Chưa bắt đầu'}</div></article>
    </section>
    <section class="suite-panel" data-suite-panel="case"><div class="case-grid"><article class="case-card"><p class="eyebrow">Production case</p><h4>Sự cố mẫu</h4><p>${incident}</p><ul><li>Impact: xác định ai bị ảnh hưởng.</li><li>Detection: log/metric/alert nào phát hiện.</li><li>Recovery: bước khôi phục nhanh nhất.</li></ul></article><article class="case-card"><p class="eyebrow">RCA template</p><h4>Mẫu ghi sau sự cố</h4><pre><code>Timeline:\nImpact:\nRoot cause:\nFix applied:\nPrevention:\nOwner:\nDue date:</code></pre></article></div></section>
    <section class="suite-panel" data-suite-panel="media"><article class="media-card"><h4>Topology/media minh họa: ${tabName}</h4><div class="media-frame">${buildSvgTopology(profile)}</div><p class="media-note">Sơ đồ này là khung tư duy nhanh. Với Cisco/Kubernetes/Architecture có thể dùng nó như topology lab; với các module khác dùng như luồng xử lý để giải thích khi học.</p></article></section>
  `;
  const anchor = panel.querySelector('.course-framework') || panel.querySelector('.lead');
  if (anchor?.nextSibling) anchor.parentNode.insertBefore(suite, anchor.nextSibling);
  else panel.prepend(suite);
  suite.querySelectorAll('.suite-tab').forEach((tab) => tab.addEventListener('click', () => {
    suite.querySelectorAll('.suite-tab').forEach((item) => item.classList.toggle('active', item === tab));
    suite.querySelectorAll('.suite-panel').forEach((item) => item.classList.toggle('active', item.dataset.suitePanel === tab.dataset.suite));
  }));
  suite.querySelector('.quiz-submit')?.addEventListener('click', () => {
    let score = 0;
    const questions = Array.from(suite.querySelectorAll('.quiz-question'));
    questions.forEach((q) => {
      const picked = q.querySelector('input:checked')?.value;
      if (picked === q.dataset.answer) score += 1;
    });
    const result = suite.querySelector('.quiz-result');
    if (result) result.textContent = `Điểm: ${score}/${questions.length}. ${score === questions.length ? 'Rất ổn.' : 'Ôn lại chương học và lab.'}`;
  });
  const status = suite.querySelector('.lab-status-pill');
  suite.querySelector('.lab-start')?.addEventListener('click', () => { localStorage.setItem(labKey, 'Đang làm'); if (status) status.textContent = 'Trạng thái: Đang làm'; });
  suite.querySelector('.lab-check')?.addEventListener('click', () => { localStorage.setItem(labKey, 'Đã kiểm tra'); if (status) status.textContent = 'Trạng thái: Đã kiểm tra'; showToast('Checklist lab: có mục tiêu, lệnh, output, verify, RCA.'); });
  suite.querySelector('.lab-reset')?.addEventListener('click', () => { localStorage.removeItem(labKey); if (status) status.textContent = 'Trạng thái: Chưa bắt đầu'; });
};
const buildAllSuites = () => modulePanels.forEach(buildSuite);
buildAllSuites();


const bookTone = {
  linux: 'Linux phải được học như một hệ điều hành sống: mọi thứ đều là file, process có vòng đời, quyền quyết định truy cập, network quyết định kết nối và log kể lại câu chuyện sự cố.',
  docker: 'Docker không chỉ là chạy container. Nó là cách đóng gói runtime, kiểm soát dependency, tách dữ liệu khỏi vòng đời process và chuẩn hóa release.',
  kubernetes: 'Kubernetes là hệ thống điều phối desired state. Bạn khai báo trạng thái mong muốn, controller liên tục quan sát và kéo cluster về trạng thái đó.',
  cicd: 'CI/CD là dây chuyền kiểm soát thay đổi. Mỗi commit phải đi qua kiểm tra, đóng gói, quét rủi ro, triển khai, verify và có đường quay lại.',
  monitoring: 'Monitoring tốt không bắt đầu bằng dashboard, mà bắt đầu bằng câu hỏi vận hành: hệ thống có sống không, chậm ở đâu, ảnh hưởng ai và xử lý thế nào.',
  security: 'DevSecOps là đưa bảo mật vào từng bước vận hành: từ quyền truy cập, secret, dependency, image, cấu hình, log cho tới phản ứng sự cố.',
  database: 'Database là nơi state sống lâu nhất. Vận hành database nghĩa là bảo vệ dữ liệu, hiểu query, kiểm soát backup, restore và quan sát hiệu năng.',
  cisco: 'Cisco Packet Tracer giúp nhìn network thành từng lớp cụ thể: frame ở switch, packet ở router, VLAN tách broadcast, ACL quyết định được phép hay bị chặn.',
  ccna: 'CCNA cần tư duy phân lớp. Khi lỗi mạng xảy ra, hãy đi từ physical, switching, IP addressing, routing, services tới security policy.',
  deploy: 'Triển khai production là một chuỗi kiểm soát rủi ro. Thành công không chỉ là web chạy, mà là web có thể quan sát, backup, rollback và bàn giao.'
};
const moduleBookTitle = (panel) => moduleTabs.find((tab) => tab.dataset.module === panel.dataset.panel)?.querySelector('strong')?.textContent || panel.dataset.panel;
const rowFacts = (panel) => Array.from(panel.querySelectorAll('.master-table tbody tr')).slice(0, 10).map((row) => {
  const cells = row.querySelectorAll('td');
  return {
    group: cells[0]?.querySelector('strong')?.textContent?.trim() || '',
    goal: cells[1]?.textContent?.trim().replace(/Basic|Intermediate|Advanced|Production/g, '').trim() || '',
    how: cells[2]?.textContent?.trim() || '',
    cmd: cells[3]?.querySelector('code')?.textContent?.trim() || '',
    note: cells[4]?.textContent?.trim() || ''
  };
});
const paragraphFor = (title, topic, facts, kind) => {
  const lead = bookTone[topic] || `${title} cần được học theo ba lớp: hiểu bản chất, thực hành có kiểm chứng và biết xử lý lỗi trong production.`;
  const names = facts.slice(0, 5).map((f) => f.goal).filter(Boolean).join(', ');
  if (kind === 'concept') return `${lead} Khi đọc chương này, đừng bắt đầu bằng việc học thuộc lệnh. Hãy bắt đầu bằng câu hỏi: thành phần này nhận đầu vào gì, xử lý như thế nào, tạo đầu ra gì, ghi log ở đâu và khi lỗi thì biểu hiện ra sao. Với ${title}, các điểm cần nắm trước là ${names || 'khái niệm, luồng xử lý, lệnh kiểm tra, dấu hiệu lỗi và cách phục hồi'}. Khi đã hiểu luồng đó, mỗi câu lệnh trong bảng phía dưới sẽ có ý nghĩa rõ ràng thay vì chỉ là một đoạn text để copy.`;
  if (kind === 'operate') return `Trong vận hành thực tế, ${title} phải được đặt trong một quy trình lặp lại: kiểm tra trạng thái hiện tại, thay đổi nhỏ, xác minh kết quả, ghi lại bằng chứng và chuẩn bị rollback. Một thao tác được xem là an toàn khi bạn biết trước nó ảnh hưởng tới service nào, có log nào để quan sát, có metric nào để xác nhận và có cách quay lại nếu kết quả xấu.`;
  if (kind === 'lab') return `Lab tốt phải có mục tiêu rõ và có lỗi giả lập. Với ${title}, hãy dựng môi trường test, chạy từng lệnh trong bảng master, chụp lại output quan trọng và cố tình tạo ít nhất một lỗi. Sau đó hãy tự phục hồi bằng log, metric, câu lệnh kiểm tra và ghi lại quy trình.`;
  if (kind === 'incident') return `Khi sự cố xảy ra, đừng sửa theo cảm giác. Hãy viết timeline: thời điểm phát hiện, phạm vi ảnh hưởng, tín hiệu đầu tiên, giả thuyết, lệnh đã chạy, thay đổi đã áp dụng và kết quả verify. Với ${title}, incident thường không nằm ở một lớp duy nhất; nó có thể bắt đầu từ cấu hình, lan sang runtime, biểu hiện qua log, rồi mới được người dùng nhìn thấy.`;
  return `Sau khi học xong ${title}, bạn cần tự giải thích được vì sao từng lệnh tồn tại, khi nào dùng, khi nào không dùng và rủi ro nếu chạy sai. Hãy ôn bằng cách che cột lệnh, chỉ nhìn mục tiêu rồi tự viết lại lệnh từ trí nhớ.`;
};
const buildLongBook = (panel) => {
  const title = moduleBookTitle(panel);
  const topic = panel.dataset.panel;
  const facts = rowFacts(panel);
  const keyItems = facts.slice(0, 6).map((f) => `<span>${f.group}: ${f.goal}</span>`).join('') || '<span>Concept</span><span>Lab</span><span>Debug</span><span>Production</span>';
  return `<div class="book-reader">
    <article class="book-chapter"><p class="eyebrow">Book chapter 01</p><h4>Bản chất của ${title}</h4><p>${paragraphFor(title, topic, facts, 'concept')}</p><p>${paragraphFor(title, topic, facts, 'operate')}</p><div class="book-key">${keyItems}</div></article>
    <article class="book-chapter"><p class="eyebrow">Book chapter 02</p><h4>Cách học qua lab</h4><p>${paragraphFor(title, topic, facts, 'lab')}</p><ul><li>Viết mục tiêu lab bằng một câu ngắn.</li><li>Chạy lệnh kiểm tra trạng thái trước khi thay đổi.</li><li>Tạo lỗi nhỏ để hiểu dấu hiệu hỏng.</li><li>Khôi phục và ghi lại bằng chứng verify.</li></ul></article>
    <article class="book-chapter"><p class="eyebrow">Book chapter 03</p><h4>Vận hành production và troubleshooting</h4><p>${paragraphFor(title, topic, facts, 'incident')}</p><p>${paragraphFor(title, topic, facts, 'review')}</p></article>
    <article class="book-chapter"><p class="eyebrow">Book chapter 04</p><h4>Checklist tự đánh giá</h4><ul><li>Giải thích được luồng hoạt động của ${title} mà không nhìn tài liệu.</li><li>Chọn đúng lệnh kiểm tra đầu tiên khi có sự cố.</li><li>Biết dấu hiệu lỗi nằm ở config, runtime, network, storage hay security.</li><li>Làm được lab, nộp output, verify kết quả và viết RCA ngắn.</li><li>Biết ít nhất một cách rollback hoặc phục hồi an toàn.</li></ul></article>
  </div>`;
};
const tutorKnowledge = (panel) => {
  const title = moduleBookTitle(panel);
  const facts = rowFacts(panel);
  const course = Array.from(panel.querySelectorAll('.course-grid section')).map((s) => `${s.querySelector('h4')?.textContent || ''}: ${s.querySelector('p')?.textContent || ''}`);
  return { title, facts, course };
};
const answerTutor = (panel, question) => {
  const q = question.toLowerCase();
  const { title, facts, course } = tutorKnowledge(panel);
  const token = q.split(/\s+/).find((w) => w.length > 3) || q;
  const commandMatches = facts.filter((f) => `${f.group} ${f.goal} ${f.how} ${f.cmd} ${f.note}`.toLowerCase().includes(token));
  if (/lệnh|command|copy|cmd|dùng gì|kiểm tra/.test(q)) {
    const rows = (commandMatches.length ? commandMatches : facts).slice(0, 4);
    return `<strong>${title} - lệnh nên xem:</strong><br>${rows.map((f) => `• ${f.goal}: <code>${f.cmd.split('\n')[0] || f.group}</code><br><small>${f.note || f.how}</small>`).join('<br>')}`;
  }
  if (/lab|thực hành|bài tập|nộp/.test(q)) return `<strong>Lab gợi ý cho ${title}:</strong><br>${course[1] || 'Dựng môi trường test, chạy lệnh trong bảng, tạo lỗi nhỏ, khôi phục và ghi RCA.'}<br><br>Hãy nộp: mục tiêu, lệnh đã chạy, output chính, lỗi gặp, cách verify.`;
  if (/lỗi|sự cố|incident|fix|debug|troubleshoot/.test(q)) return `<strong>Cách debug ${title}:</strong><br>1. Xác nhận triệu chứng.<br>2. Thu thập log/metric/output trước khi sửa.<br>3. Khoanh vùng layer liên quan.<br>4. Sửa nhỏ nhất có thể.<br>5. Verify và ghi RCA.<br><br>Tình huống mẫu: ${course[3] || 'service lỗi trong production, cần khôi phục rồi tìm nguyên nhân gốc.'}`;
  if (/học gì|bắt đầu|tổng quan|giải thích|là gì/.test(q)) return `<strong>Tổng quan ${title}:</strong><br>${course[0] || paragraphFor(title, panel.dataset.panel, facts, 'concept')}<br><br>Nên học theo thứ tự: lý thuyết → lab → bảng lệnh → quiz → case study.`;
  if (/quiz|câu hỏi|thi|ôn/.test(q)) return `<strong>Ôn tập ${title}:</strong><br>${course[2] || 'Hãy tự trả lời: bản chất là gì, lỗi thường gặp là gì, lệnh kiểm tra đầu tiên là gì, rollback thế nào?'}<br><br>Sau đó làm quiz trong tab Quiz và kiểm tra lại các câu sai.`;
  return `<strong>AI Tutor cho ${title}:</strong><br>Mình trả lời theo nội dung có sẵn trong module này. Bạn có thể hỏi: “học gì”, “lệnh kiểm tra”, “lab”, “debug lỗi”, “quiz”, hoặc nhập từ khóa như nginx, rollback, OSPF, pg_dump, kubectl.`;
};
const buildTutor = (panel) => {
  const title = moduleBookTitle(panel);
  return `<div class="tutor-shell"><div class="tutor-chat"><div class="tutor-output"><strong>AI Tutor - ${title}</strong><br>Hỏi mình về lý thuyết, lệnh, lab, debug hoặc ôn tập trong module này. AI Tutor này chạy offline theo nội dung trang, không dùng API.</div><form class="tutor-form"><input class="tutor-input" placeholder="Ví dụ: module này bắt đầu học gì? lệnh kiểm tra lỗi? lab nên làm gì?"/><button type="submit">Hỏi</button></form></div><div class="tutor-side"><button type="button" class="tutor-suggest">Module này học gì?</button><button type="button" class="tutor-suggest">Cho tôi lab thực hành</button><button type="button" class="tutor-suggest">Khi lỗi thì debug thế nào?</button><button type="button" class="tutor-suggest">Các lệnh quan trọng?</button><div class="tutor-note">AI Tutor giả lập offline: trả lời dựa trên nội dung module hiện tại, phù hợp học cá nhân và không cần internet/API key.</div></div></div>`;
};
const upgradeSuiteBooksAndTutors = () => {
  modulePanels.forEach((panel) => {
    const suite = panel.querySelector('.deep-suite');
    if (!suite || suite.dataset.bookTutorReady) return;
    suite.dataset.bookTutorReady = '1';
    const tabs = suite.querySelector('.suite-tabs');
    tabs?.insertAdjacentHTML('afterbegin', '<button type="button" class="suite-tab" data-suite="book">Sách học dài</button>');
    tabs?.insertAdjacentHTML('beforeend', '<button type="button" class="suite-tab" data-suite="tutor">AI Tutor</button>');
    suite.insertAdjacentHTML('beforeend', `<section class="suite-panel" data-suite-panel="book">${buildLongBook(panel)}</section>`);
    suite.insertAdjacentHTML('beforeend', `<section class="suite-panel" data-suite-panel="tutor">${buildTutor(panel)}</section>`);
    suite.querySelectorAll('.suite-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        suite.querySelectorAll('.suite-tab').forEach((item) => item.classList.toggle('active', item === tab));
        suite.querySelectorAll('.suite-panel').forEach((item) => item.classList.toggle('active', item.dataset.suitePanel === tab.dataset.suite));
      });
    });
    const tutorPanel = suite.querySelector('[data-suite-panel="tutor"]');
    const output = tutorPanel?.querySelector('.tutor-output');
    const input = tutorPanel?.querySelector('.tutor-input');
    tutorPanel?.querySelector('.tutor-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      output.innerHTML += `<hr><strong>Bạn:</strong> ${q}<br>${answerTutor(panel, q)}`;
      output.scrollTop = output.scrollHeight;
      input.value = '';
    });
    tutorPanel?.querySelectorAll('.tutor-suggest').forEach((btn) => btn.addEventListener('click', () => {
      const q = btn.textContent.trim();
      output.innerHTML += `<hr><strong>Bạn:</strong> ${q}<br>${answerTutor(panel, q)}`;
      output.scrollTop = output.scrollHeight;
    }));
  });
};
upgradeSuiteBooksAndTutors();


const ensureAiTutorFloat = () => {
  if (document.querySelector('.ai-tutor-float')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ai-tutor-float';
  button.textContent = 'AI Tutor';
  button.addEventListener('click', () => {
    const activePanel = modulePanels.find((panel) => panel.classList.contains('active')) || modulePanels[0];
    const suite = activePanel?.querySelector('.deep-suite');
    const tutorTab = suite?.querySelector('[data-suite="tutor"]');
    if (tutorTab) {
      tutorTab.click();
      suite.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      showToast('AI Tutor đang tải, hãy Ctrl+F5 nếu chưa thấy.');
    }
  });
  document.body.appendChild(button);
};
ensureAiTutorFloat();


/* LEARNIT_FEATURE_PACK_20260719_29 */
const featureModules = [
  {
    id: 'errors', no: '38', title: 'Lỗi thường gặp', sub: '502, SSL, disk, Docker, K8s, DB', eyebrow: 'Error encyclopedia', h2: 'Bảng lỗi thường gặp khi vận hành production',
    lead: 'Khu này dùng khi hệ thống đang lỗi thật. Mỗi dòng đi theo công thức: triệu chứng, nguyên nhân hay gặp, lệnh kiểm tra, cách xử lý nhanh và cách phòng tránh.',
    rows: [
      ['Web', '502 Bad Gateway', 'Nginx không kết nối được upstream: app chết, sai port, socket permission hoặc timeout.', 'sudo nginx -t\nsudo systemctl status nginx --no-pager\nsudo journalctl -u nginx -n 120 --no-pager\nsudo ss -ltnp | grep -E ":80|:443|:3000|:8000"\ncurl -v http://127.0.0.1:3000/health', 'Kiểm tra upstream trước, reload nginx sau khi config hợp lệ. Nếu app chết thì đọc log app, không chỉ restart nginx.'],
      ['Web', '403 Forbidden', 'Sai permission, thiếu index, nginx user không đọc được file, SELinux/AppArmor hoặc deny rule.', 'namei -l /var/www/site/index.html\nls -lah /var/www/site\ngrep -R "deny all\|root\|index" /etc/nginx/sites-enabled -n\nsudo tail -100 /var/log/nginx/error.log', 'Sửa owner/permission theo nguyên tắc tối thiểu. Không chmod 777 webroot.'],
      ['Web', '404 Not Found', 'Sai root/alias, rewrite sai, route app chưa có, deploy thiếu file build.', 'sudo nginx -T | grep -A8 -B4 "server_name"\nfind /var/www -maxdepth 3 -type f | head\ncurl -I https://domain/path\nsudo tail -100 /var/log/nginx/access.log', 'Phân biệt 404 từ nginx và 404 từ app bằng header/log upstream.'],
      ['TLS', 'SSL hết hạn', 'Certbot chưa renew, DNS sai, nginx dùng cert cũ, port 80 bị chặn.', 'openssl s_client -connect domain:443 -servername domain </dev/null 2>/dev/null | openssl x509 -noout -dates\nsudo certbot certificates\nsudo systemctl list-timers | grep certbot\nsudo nginx -t', 'Renew xong phải reload nginx. Đặt alert trước ngày hết hạn 14/7/3 ngày.'],
      ['DNS', 'Domain không trỏ đúng', 'A/AAAA/CNAME sai, cache DNS, Cloudflare proxy, split-horizon DNS.', 'dig +short A domain\ndig +trace domain\ndig @1.1.1.1 domain\ndig @8.8.8.8 domain\ncurl -Ik https://domain', 'Kiểm tra authoritative DNS và public resolver. Đừng chỉ tin DNS cache trên máy cá nhân.'],
      ['Linux', 'No space left on device', 'Disk full, inode full, log phình, file đã xóa nhưng process còn giữ.', 'df -h\ndf -ih\nsudo du -xh /var | sort -h | tail -40\nsudo lsof +L1\njournalctl --disk-usage', 'Xác định dung lượng hay inode. Nếu lsof +L1 có file lớn, restart đúng process giữ file.'],
      ['Linux', 'Permission denied', 'Sai owner, thiếu execute bit trên thư mục cha, user service khác user deploy.', 'whoami\nid\nnamei -l /path/to/file\ngetfacl /path/to/file\nps aux | grep nginx', 'Với thư mục, cần quyền x để đi xuyên qua path. Kiểm tra user đang chạy service.'],
      ['Systemd', 'Service start failed', 'Config sai, env thiếu, port bị chiếm, quyền file sai, dependency chưa chạy.', 'sudo systemctl status service --no-pager\nsudo journalctl -u service -n 200 --no-pager\nsudo ss -ltnp\nsudo systemctl cat service', 'Đọc journalctl trước khi restart nhiều lần. Kiểm tra ExecStart, WorkingDirectory, EnvironmentFile.'],
      ['Docker', 'Container exited', 'Command crash, env thiếu, volume permission, image sai arch, healthcheck fail.', 'docker ps -a\ndocker logs --tail=200 container\ndocker inspect container --format "{{.State.ExitCode}} {{.State.Error}}"\ndocker compose ps', 'Xem exit code và log. Nếu lỗi permission volume, sửa owner trên host hoặc user trong container.'],
      ['Docker', 'Image pull lỗi', 'Registry auth, tag không tồn tại, DNS/proxy, rate limit.', 'docker pull image:tag\ndocker login registry\ndocker info\ncat /etc/docker/daemon.json\nresolvectl status', 'Pin tag rõ ràng. Với production cần mirror/cache registry nếu quan trọng.'],
      ['Kubernetes', 'CrashLoopBackOff', 'App crash lặp, env/secret thiếu, probe sai, command sai.', 'kubectl get pods -A\nkubectl describe pod POD -n NS\nkubectl logs POD -n NS --previous\nkubectl get events -n NS --sort-by=.lastTimestamp', 'Đọc logs --previous vì container đã restart. Kiểm tra env, secret, configmap, probe.'],
      ['Kubernetes', 'ImagePullBackOff', 'Sai image/tag, registry secret thiếu, node không ra internet.', 'kubectl describe pod POD -n NS\nkubectl get secret -n NS\nkubectl create secret docker-registry regcred ...\nkubectl patch sa default -p ...', 'Kiểm tra event trước. Không redeploy mù khi lỗi nằm ở imagePullSecret.'],
      ['Kubernetes', 'Service không truy cập được', 'Selector sai, endpoint rỗng, targetPort sai, network policy chặn.', 'kubectl get svc,endpoints -n NS\nkubectl describe svc SERVICE -n NS\nkubectl get pods -n NS --show-labels\nkubectl exec -n NS POD -- curl -v http://SERVICE:PORT', 'Endpoint rỗng thường là selector không match label pod.'],
      ['Database', 'Too many connections', 'Pool sai, query treo, app leak connection, max_connections thấp.', 'SELECT count(*) FROM pg_stat_activity;\nSELECT state, count(*) FROM pg_stat_activity GROUP BY state;\nSELECT pid, now()-query_start, query FROM pg_stat_activity ORDER BY query_start LIMIT 10;', 'Giảm pool, kill session bất thường có kiểm soát, thêm PgBouncer nếu cần.'],
      ['Database', 'Query chậm', 'Thiếu index, query plan xấu, lock, table phình.', 'EXPLAIN (ANALYZE, BUFFERS) SELECT ...;\nSELECT * FROM pg_stat_activity WHERE wait_event IS NOT NULL;\nSELECT relname,n_dead_tup FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 20;', 'Không thêm index bừa trên production giờ cao điểm. Đọc plan và đo lại sau thay đổi.'],
      ['Security', 'SSH brute force', 'Mật khẩu yếu, root login mở, firewall chưa giới hạn, fail2ban chưa có.', 'sudo journalctl -u ssh -n 200 --no-pager\nsudo grep "Failed password" /var/log/auth.log | tail\nsudo ss -tulpen\nsudo ufw status verbose', 'Tắt root/password login nếu có thể, dùng key, fail2ban, allowlist qua VPN/Tailscale.']
    ]
  },
  {
    id: 'runbook', no: '39', title: 'Runbook sự cố', sub: 'Server down, web chậm, disk full, attack', eyebrow: 'Incident response', h2: 'Runbook phản ứng nhanh khi có sự cố thật',
    lead: 'Runbook là quy trình thao tác khi áp lực cao. Mục tiêu là giảm thời gian khôi phục, tránh sửa theo cảm giác và giữ lại bằng chứng để viết RCA.',
    rows: [
      ['P1', 'Website down hoàn toàn', 'Xác nhận lỗi từ ngoài, kiểm tra DNS/TLS/Nginx/app/database theo thứ tự từ ngoài vào trong.', 'curl -Ik https://domain\ndig +short domain\nsudo systemctl status nginx --no-pager\nsudo journalctl -u nginx -n 100 --no-pager\nsudo ss -ltnp\ndocker compose ps', 'Nếu ảnh hưởng khách hàng, mở incident, ghi timeline, ưu tiên khôi phục trước rồi RCA sau.'],
      ['P1', 'Server không SSH được', 'Kiểm tra Tailscale/VPN, ping, port 22, console provider, firewall, fail2ban.', 'ping SERVER\nnc -vz SERVER 22\ntailscale status\nssh -vvv user@SERVER\nsudo fail2ban-client status sshd', 'Luôn có đường vào dự phòng: console VPS, Tailscale, user break-glass.'],
      ['P1', 'Disk full production', 'Xác định mount đầy, inode, log lớn, file bị xóa nhưng process giữ.', 'df -h\ndf -ih\nsudo du -xh / | sort -h | tail -50\nsudo lsof +L1\njournalctl --vacuum-time=7d', 'Dọn đúng nơi. Không xóa database/data chưa biết. Sau khôi phục phải thêm alert disk.'],
      ['P1', 'Database down', 'Kiểm tra service, log, disk, connection, backup gần nhất và khả năng restore.', 'sudo systemctl status postgresql --no-pager\nsudo journalctl -u postgresql -n 200 --no-pager\ndf -h\npg_isready\nls -lah /backup', 'Không chạy lệnh destructive. Snapshot trước khi repair nếu có thể.'],
      ['P2', 'Website chậm', 'Đo TTFB, CPU/RAM/IO, slow query, upstream latency, cache hit.', 'curl -w "time_namelookup:%{time_namelookup} connect:%{time_connect} start:%{time_starttransfer} total:%{time_total}\n" -o /dev/null -s https://domain\ntop\niostat -xz 1\nsudo tail -100 /var/log/nginx/access.log', 'Tách chậm do client/network với chậm do backend. Đừng tối ưu trước khi đo.'],
      ['P2', 'Deploy lỗi cần rollback', 'Dừng rollout, quay lại version ổn, verify health, giữ log để phân tích.', 'git log --oneline -5\ndocker compose ps\ndocker compose pull old-image\ndocker compose up -d\nkubectl rollout undo deploy/app -n NS\nkubectl rollout status deploy/app -n NS', 'Rollback phải là nút đã luyện trước, không phải nghĩ lần đầu khi production cháy.'],
      ['P2', 'Alert CPU/RAM cao', 'Xác định process, container, request tăng bất thường, memory leak hoặc batch job.', 'top -o %CPU\nps aux --sort=-%mem | head\ndocker stats --no-stream\npidstat 1 5\nfree -h', 'Nếu cần giảm tải, rate limit hoặc scale trước, điều tra root cause sau.'],
      ['P2', 'Nghi bị brute force', 'Cô lập nguồn tấn công, khóa password login, kiểm tra account lạ, giữ log.', 'sudo grep "Failed password" /var/log/auth.log | tail -100\nsudo last -a | head\nsudo awk -F: "$3>=1000{print}" /etc/passwd\nsudo ss -tulpen', 'Không xóa log. Thay key/password liên quan và review authorized_keys.'],
      ['P3', 'Backup lỗi', 'Kiểm tra job, dung lượng đích, quyền ghi, checksum, restore test gần nhất.', 'systemctl list-timers\nsudo journalctl -u backup -n 200 --no-pager\ndf -h /backup\nfind /backup -type f -mtime -2 -ls\nsha256sum backup.tar.gz', 'Backup chưa restore thử thì chưa được xem là backup tin cậy.'],
      ['RCA', 'Mẫu báo cáo sau sự cố', 'Ghi timeline, impact, root cause, corrective action, preventive action, owner và deadline.', 'cat > rca.md <<EOF\n# RCA\nImpact:\nTimeline:\nRoot cause:\nFix:\nPrevention:\nOwner:\nDue date:\nEOF', 'RCA không để đổ lỗi cá nhân. Mục tiêu là giảm khả năng lặp lại.']
    ]
  },
  {
    id: 'cheatsheet', no: '40', title: 'Cheatsheet nhanh', sub: 'Linux, Docker, K8s, Git, Nginx, DB', eyebrow: 'Fast command lookup', h2: 'Cheatsheet copy nhanh cho DevOps',
    lead: 'Trang này chỉ để tra cứu nhanh. Dùng tìm kiếm toàn cục hoặc bảng bên phải, bấm đúp vào ô lệnh màu đen để copy.',
    rows: [
      ['Linux', 'Thông tin máy', 'Xem OS, kernel, uptime, user login.', 'hostnamectl\ncat /etc/os-release\nuname -a\nuptime\nw', 'Dùng đầu tiên khi nhận server hoặc audit.'],
      ['Linux', 'Tài nguyên', 'CPU/RAM/disk/inode/process.', 'top\nfree -h\ndf -h\ndf -ih\nps aux --sort=-%mem | head', 'Nếu disk đầy, xem inode và file process giữ.'],
      ['Linux', 'Network', 'Port, route, DNS, HTTP check.', 'ss -tulpen\nip a\nip route\ndig domain\ncurl -Iv https://domain', 'ss thay netstat trên hệ mới.'],
      ['Systemd', 'Service', 'Quản lý service và log.', 'systemctl status nginx --no-pager\nsystemctl restart nginx\nsystemctl reload nginx\njournalctl -u nginx -n 100 --no-pager', 'Reload khi chỉ đổi config hỗ trợ reload.'],
      ['Nginx', 'Config test', 'Kiểm tra config và xem full config.', 'nginx -t\nnginx -T\nsystemctl reload nginx\ntail -f /var/log/nginx/error.log', 'Luôn nginx -t trước reload.'],
      ['TLS', 'Cert', 'Kiểm tra cert và renew.', 'certbot certificates\ncertbot renew --dry-run\nopenssl s_client -connect domain:443 -servername domain </dev/null 2>/dev/null | openssl x509 -noout -dates', 'Đặt alert hết hạn cert.'],
      ['Docker', 'Container', 'List, log, exec, restart.', 'docker ps -a\ndocker logs -f --tail=100 NAME\ndocker exec -it NAME sh\ndocker restart NAME', 'Xem log trước restart.'],
      ['Docker', 'Compose', 'Deploy compose.', 'docker compose ps\ndocker compose pull\ndocker compose up -d\ndocker compose logs -f --tail=100\ndocker compose down', 'down có thể làm mất network tạm thời.'],
      ['K8s', 'Pod debug', 'Pod, describe, logs, exec.', 'kubectl get pods -A\nkubectl describe pod POD -n NS\nkubectl logs POD -n NS --previous\nkubectl exec -it POD -n NS -- sh', 'Describe để đọc event.'],
      ['K8s', 'Rollout', 'Deploy, undo, status.', 'kubectl rollout status deploy/app -n NS\nkubectl rollout history deploy/app -n NS\nkubectl rollout undo deploy/app -n NS\nkubectl scale deploy/app --replicas=3 -n NS', 'Rollback cần version image/tag rõ.'],
      ['Git', 'Release', 'Log, diff, tag, revert.', 'git status\ngit log --oneline -10\ngit diff\ngit tag v1.0.0\ngit revert COMMIT', 'Ưu tiên revert thay vì rewrite history production.'],
      ['PostgreSQL', 'Backup restore', 'Dump/restore nhanh.', 'pg_dump -Fc DB > db.dump\npg_restore -d DB db.dump\npsql -d DB -c "select now();"\npg_isready', 'Restore test định kỳ.'],
      ['MySQL', 'Backup restore', 'Dump/restore nhanh.', 'mysqldump DB > db.sql\nmysql DB < db.sql\nmysqladmin ping\nmysql -e "SHOW PROCESSLIST;"', 'Cẩn thận lock khi dump database lớn.'],
      ['Security', 'Firewall', 'UFW/firewalld cơ bản.', 'ufw status verbose\nufw allow 22/tcp\nufw allow 80,443/tcp\nfirewall-cmd --list-all\nfirewall-cmd --reload', 'Không khóa SSH trước khi có session dự phòng.'],
      ['Monitoring', 'Prometheus/Loki', 'Kiểm tra targets/log.', 'curl -s http://localhost:9090/-/ready\ncurl -s http://localhost:3100/ready\ndocker compose logs prometheus loki grafana --tail=100', 'Dashboard đẹp không thay thế alert đúng.']
    ]
  },
  {
    id: 'production', no: '41', title: 'Production Standard', sub: 'Checklist trước khi lên thật', eyebrow: 'Production readiness', h2: 'Chuẩn production trước khi đưa hệ thống ra khách hàng',
    lead: 'Đây là checklist tiêu chuẩn để một hệ thống không chỉ chạy được mà còn có thể bảo vệ, giám sát, backup, rollback và bàn giao vận hành.',
    rows: [
      ['Access', 'SSH và tài khoản', 'Tắt root/password nếu có thể, dùng SSH key, sudo theo nhóm, user deploy riêng.', 'grep -E "PermitRootLogin|PasswordAuthentication" /etc/ssh/sshd_config\nid deploy\nsudo -l -U deploy\nls -lah ~/.ssh/authorized_keys', 'Có break-glass account nhưng phải kiểm soát và audit.'],
      ['Network', 'Firewall và exposure', 'Chỉ mở port cần thiết, quản trị qua VPN/Tailscale, scan bề mặt phơi nhiễm.', 'ss -tulpen\nufw status verbose\nnmap -sV SERVER\ntailscale status', 'Port quản trị không nên public nếu không cần.'],
      ['Web', 'TLS và security headers', 'HTTPS bắt buộc, HSTS cân nhắc, CSP, X-Frame-Options, Referrer-Policy.', 'curl -Ik https://domain\nopenssl s_client -connect domain:443 -servername domain </dev/null 2>/dev/null | openssl x509 -noout -dates', 'CSP phải test kỹ để không phá frontend.'],
      ['Runtime', 'Process manager', 'Systemd/Docker/K8s có restart policy, healthcheck, resource limit.', 'systemctl status app --no-pager\ndocker inspect app --format "{{json .HostConfig.RestartPolicy}}"\ndocker stats --no-stream', 'Healthcheck phải kiểm tra chức năng quan trọng, không chỉ port mở.'],
      ['Config', 'Secret management', 'Secret không nằm trong Git, phân quyền env, rotation có kế hoạch.', 'find . -name ".env*" -ls\ngit secrets --scan || true\nls -l /etc/app.env', 'Secret leak thì rotate, không chỉ xóa khỏi file.'],
      ['Data', 'Backup policy', 'Định nghĩa RPO/RTO, backup tự động, offsite, mã hóa, checksum.', 'systemctl list-timers | grep backup\nfind /backup -type f -mtime -2 -ls\nsha256sum /backup/latest*', 'Backup phải có restore drill mới đáng tin.'],
      ['Recovery', 'Rollback plan', 'Có version, artifact, migration strategy, lệnh rollback đã test.', 'git tag --list | tail\ndocker images | head\nkubectl rollout history deploy/app -n NS', 'Migration database cần backward compatible nếu muốn rollback nhanh.'],
      ['Observe', 'Monitoring', 'Golden signals: availability, latency, traffic, errors, saturation.', 'curl -s http://localhost:9090/-/ready\ncurl -s http://localhost:3000/api/health\ndocker compose ps', 'Alert phải có ngưỡng, owner, runbook.'],
      ['Logs', 'Log retention', 'Log đủ để điều tra, có retention, không ghi secret/PII.', 'journalctl --disk-usage\ndu -sh /var/log/*\ncurl -s http://localhost:3100/ready', 'Log phải truy vấn được sau sự cố, không chỉ tồn tại trên máy local.'],
      ['Security', 'Patch và hardening', 'Update định kỳ, audit package, fail2ban, least privilege, baseline.', 'apt list --upgradable\nlynis audit system\nfail2ban-client status\nsudo aa-status || true', 'Patch critical cần SLA riêng.'],
      ['CI/CD', 'Pipeline gate', 'Lint/test/build/scan/deploy/verify/rollback trong pipeline.', 'gitlab-runner status || true\ngh run list || true\ndocker scout cves image || true\ntrivy image image:tag', 'Không đưa artifact chưa scan vào production nếu có thể tránh.'],
      ['Docs', 'Bàn giao vận hành', 'Sơ đồ kiến trúc, env, runbook, backup, restore, contact, SLA.', 'tree -L 2 docs\nls docs/runbooks docs/architecture docs/backup', 'Tài liệu tốt giúp xử lý sự cố nhanh hơn khi người chính vắng mặt.']
    ]
  }
];

/* SYSTEM_FIX_LIBRARY_20260723_4
   Operational runbooks grouped as a dedicated folder at the end of LearnIT. */
featureModules.push(
  {
    id: 'fixcenter', no: 'F00', title: 'Trung tâm xử lý sự cố', sub: 'Chẩn đoán, output, incident, RCA', eyebrow: 'Operations workbench', h2: 'Trung tâm chẩn đoán và xử lý sự cố hệ thống',
    lead: 'Chọn triệu chứng, đi theo từng bước, dán output để phân tích và ghi lại toàn bộ timeline xử lý trong một phiên incident.',
    rows: [
      ['Triage', 'Website không truy cập được', 'Đi từ DNS, TLS, edge, Nginx tới upstream và database.', 'dig +short DOMAIN\ncurl -sSIk https://DOMAIN\nsudo nginx -t\nsudo systemctl status nginx --no-pager', 'Dùng trình chẩn đoán phía trên để nhận đúng thứ tự và liên kết runbook.'],
      ['Triage', 'CPU/RAM hoặc disk bất thường', 'Xác định saturation, process, OOM, inode và I/O trước khi dọn/restart.', 'uptime\nfree -h\ndf -h\ndf -ih\nps aux --sort=-%cpu | head -20', 'Dán output vào bộ phân tích để đánh dấu dấu hiệu nguy hiểm.'],
      ['Incident', 'Ghi timeline và RCA', 'Mỗi thao tác cần thời gian, người thực hiện, kết quả và bước rollback.', 'date -Is\nhostnamectl\nsystemctl --failed --no-pager', 'Xuất Markdown hoặc in PDF khi kết thúc incident.']
    ]
  },
  {
    id: 'fixhealth', no: 'F01', title: 'Tổng kiểm tra sống/chết', sub: 'Health check toàn bộ stack', eyebrow: 'System health triage', h2: 'Kiểm tra nhanh thành phần nào còn sống và thành phần nào đang lỗi',
    lead: 'Bắt đầu tại đây khi chưa biết lỗi nằm ở đâu. Chụp trạng thái trước khi restart để không làm mất bằng chứng.',
    rows: [
      ['Host', 'Tình trạng máy chủ', 'Xác nhận uptime, tải, RAM, disk, inode và lỗi kernel trước khi nhìn ứng dụng.', 'date\nhostnamectl\nuptime\nfree -h\ndf -h\ndf -ih\nsudo dmesg -T --level=err,warn | tail -80', 'Nếu load, disk hoặc OOM bất thường, xử lý tài nguyên trước khi restart hàng loạt service.'],
      ['Systemd', 'Service failed', 'Liệt kê unit lỗi và trạng thái service cốt lõi.', 'systemctl --failed --no-pager\nfor s in nginx crowdsec crowdsec-firewall-bouncer docker containerd postgresql mysql redis-server cloudflared tailscaled; do printf "%-32s " "$s"; systemctl is-active "$s" 2>/dev/null || true; done', 'Tên unit thay đổi theo distro. Dùng systemctl list-unit-files để tìm tên thật.'],
      ['Web', 'Nginx và HTTP', 'Kiểm tra config, process, port nội bộ và request từ ngoài.', 'sudo nginx -t\nsystemctl is-active nginx\nsudo ss -ltnp | grep -E ":80|:443"\ncurl -sS -o /dev/null -w "%{http_code} %{time_total}s\\n" http://127.0.0.1\ncurl -Ik https://DOMAIN', 'Thay DOMAIN. Phân biệt Nginx sống với upstream/app thực sự khỏe.'],
      ['Security', 'CrowdSec và firewall', 'Kiểm tra engine, bouncer, quyết định chặn và firewall hiện hành.', 'systemctl is-active crowdsec\nsystemctl is-active crowdsec-firewall-bouncer\nsudo cscli metrics\nsudo cscli decisions list\nsudo nft list ruleset | head -120\nsudo ufw status verbose', 'Không flush firewall trên production. Xác nhận IP quản trị không bị chặn nhầm.'],
      ['Data', 'Database và cache', 'Dùng probe riêng của từng dịch vụ thay vì chỉ nhìn process.', 'pg_isready 2>/dev/null || true\nmysqladmin ping 2>/dev/null || true\nredis-cli ping 2>/dev/null || true\nsystemctl --no-pager --full status postgresql mysql redis-server 2>/dev/null', 'Probe lỗi có thể do auth/socket khác, cần đọc log tương ứng trước khi restart.'],
      ['Observe', 'Monitoring stack', 'Kiểm tra endpoint ready của Prometheus, Grafana, Loki và Alertmanager.', 'curl -fsS http://127.0.0.1:9090/-/ready\ncurl -fsS http://127.0.0.1:3000/api/health\ncurl -fsS http://127.0.0.1:3100/ready\ncurl -fsS http://127.0.0.1:9093/-/ready', 'Port có thể được bind trong container/network riêng; đối chiếu docker compose ps hoặc ss.']
    ]
  },
  {
    id: 'fixlinux', no: 'F02', title: 'Linux & systemd', sub: 'Boot, service, quyền, process', eyebrow: 'Linux failure modes', h2: 'Fix lỗi Linux, systemd, quyền và tiến trình',
    lead: 'Đi từ triệu chứng tới unit, journal, user chạy process, file cấu hình và dependency. Không restart lặp khi chưa đọc lỗi.',
    rows: [
      ['Systemd', 'Service không khởi động', 'Sai ExecStart, WorkingDirectory, EnvironmentFile, quyền hoặc dependency.', 'sudo systemctl status SERVICE --no-pager -l\nsudo journalctl -u SERVICE -b -n 250 --no-pager\nsudo systemctl cat SERVICE\nsudo systemd-analyze verify /etc/systemd/system/SERVICE.service', 'Sửa unit rồi chạy systemctl daemon-reload, start và verify; lưu bản cũ để rollback.'],
      ['Boot', 'Máy boot chậm hoặc lỗi', 'Xác định unit chờ lâu, lỗi của boot hiện tại và boot trước.', 'systemd-analyze\nsystemd-analyze blame | head -30\nsystemctl --failed --no-pager\njournalctl -b -p warning --no-pager\njournalctl -b -1 -p warning --no-pager', 'Không disable unit chỉ vì đứng đầu blame; kiểm tra dependency và chức năng trước.'],
      ['Permission', 'Permission denied', 'Thiếu quyền ở một thư mục cha, owner sai, ACL, SELinux hoặc AppArmor.', 'id SERVICE_USER\nnamei -l /PATH/TO/FILE\ngetfacl /PATH/TO/FILE\nps -eo user,group,pid,cmd | grep PROCESS\nsudo aa-status 2>/dev/null || true\ngetenforce 2>/dev/null || true', 'Không chmod 777. Cấp đúng owner/group và quyền tối thiểu cho user chạy service.'],
      ['Process', 'CPU cao hoặc process treo', 'Tìm process/thread gây tải, syscall hoặc file đang giữ.', 'top -H\nps aux --sort=-%cpu | head -25\npidstat -p PID 1 10\nsudo strace -p PID -f -tt -T -o /tmp/PID.strace\nsudo lsof -p PID | head -100', 'Strace có overhead; chỉ chạy ngắn và lưu output để phân tích.'],
      ['Journal', 'Không tìm thấy log', 'Unit có thể ghi journal, syslog, file riêng hoặc stdout container.', 'sudo journalctl -u SERVICE --since "2 hours ago" --no-pager\nsudo journalctl _PID=PID --no-pager\nsudo systemctl show SERVICE -p StandardOutput -p StandardError\nsudo find /var/log -type f -mmin -30 -ls | head -80', 'Dùng systemctl cat và config ứng dụng để xác nhận đường log, không đoán tên file.']
    ]
  },
  {
    id: 'fixwebedge', no: 'F03', title: 'Nginx, TLS & Cloudflare', sub: 'HTTP 4xx/5xx, DNS, edge', eyebrow: 'Web and edge debugging', h2: 'Fix Nginx, chứng chỉ TLS và Cloudflare theo đường đi request',
    lead: 'Tách lỗi client → DNS → Cloudflare → TLS → Nginx → upstream để tránh sửa sai lớp.',
    rows: [
      ['Nginx', '502/504 upstream', 'Nginx không kết nối được app, sai port/socket hoặc upstream quá chậm.', 'sudo nginx -t\nsudo nginx -T | grep -nE "server_name|proxy_pass|upstream"\nsudo tail -200 /var/log/nginx/error.log\nsudo ss -ltnp\ncurl -v http://127.0.0.1:APP_PORT/health', 'Sửa upstream/app trước; 504 cần đo timeout và latency, không chỉ tăng timeout.'],
      ['Nginx', '404/403 hoặc sai site', 'Sai server_name, root/alias, permission hoặc vhost mặc định nhận request.', 'sudo nginx -T > /tmp/nginx-full.txt\ngrep -nE "server_name|root |alias |deny |try_files" /tmp/nginx-full.txt\nnamei -l /var/www/SITE/index.html\ncurl -I -H "Host: DOMAIN" http://127.0.0.1\nsudo tail -100 /var/log/nginx/access.log /var/log/nginx/error.log', 'Log path có thể tùy biến; xem access_log/error_log trong nginx -T.'],
      ['TLS', 'Cert hết hạn hoặc sai domain', 'Nginx dùng cert cũ, renew lỗi, chain thiếu hoặc DNS challenge sai.', 'openssl s_client -connect DOMAIN:443 -servername DOMAIN </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates -ext subjectAltName\nsudo certbot certificates\nsudo certbot renew --dry-run\nsystemctl list-timers | grep -i certbot', 'Sau renew phải nginx -t và reload. Thiết lập cảnh báo hạn cert trước 14/7/3 ngày.'],
      ['Cloudflare', 'Kiểm tra edge còn sống', 'Xác nhận trạng thái Cloudflare, DNS public và response có đi qua edge.', 'curl -fsS https://www.cloudflarestatus.com/api/v2/status.json\ndig +short A DOMAIN @1.1.1.1\ndig +short AAAA DOMAIN @1.1.1.1\ncurl -sSIk https://DOMAIN | grep -iE "^HTTP|server:|cf-ray:|cf-cache-status:"', 'Cloudflare không có log trong /var/log local; dùng Dashboard Log Explorer hoặc Logpush nếu gói hỗ trợ.'],
      ['Cloudflare', '522/523/525/526', '522 timeout tới origin; 523 origin unreachable; 525 handshake; 526 cert origin không hợp lệ.', 'curl -Ik --resolve DOMAIN:443:ORIGIN_IP https://DOMAIN\nnc -vz ORIGIN_IP 443\nsudo ss -ltnp | grep :443\nsudo ufw status verbose\nsudo journalctl -u nginx -n 150 --no-pager', 'Kiểm tra firewall cho dải IP Cloudflare và chế độ SSL; không tắt xác minh TLS lâu dài.'],
      ['Cloudflared', 'Tunnel offline', 'Connector chết, token/config sai, DNS hoặc egress bị chặn.', 'systemctl status cloudflared --no-pager -l\njournalctl -u cloudflared -b -n 250 --no-pager\ncloudflared tunnel list\ncloudflared tunnel info TUNNEL_NAME\ngrep -n . /etc/cloudflared/config.yml', 'Log chính thường ở journald; nếu chạy container dùng docker logs. Không in token vào ticket.']
    ]
  },
  {
    id: 'fixsecurity', no: 'F04', title: 'CrowdSec, SSH & Firewall', sub: 'Block, bouncer, auth log', eyebrow: 'Security operations', h2: 'Fix CrowdSec, Fail2ban, SSH và firewall mà không tự khóa quản trị',
    lead: 'Luôn giữ một phiên SSH/console dự phòng trước khi đổi firewall, sshd hoặc quyết định chặn.',
    rows: [
      ['CrowdSec', 'Engine không chạy', 'Kiểm tra service, collection, acquisition và parser error.', 'systemctl status crowdsec --no-pager -l\nsudo journalctl -u crowdsec -b -n 250 --no-pager\nsudo tail -200 /var/log/crowdsec.log 2>/dev/null\nsudo cscli metrics\nsudo cscli collections list\nsudo cscli hub list', 'Log file phụ thuộc cấu hình; journald luôn là điểm kiểm tra đầu tiên trên systemd.'],
      ['Bouncer', 'Có decision nhưng không block', 'Firewall bouncer chết, API key sai hoặc rule nftables/iptables chưa được tạo.', 'systemctl status crowdsec-firewall-bouncer --no-pager -l\nsudo journalctl -u crowdsec-firewall-bouncer -b -n 200 --no-pager\nsudo cscli bouncers list\nsudo cscli decisions list\nsudo nft list ruleset | grep -i crowdsec -C 3', 'Xác nhận backend firewall. Test bằng IP lab, không dùng IP quản trị thật.'],
      ['CrowdSec', 'Bị chặn nhầm IP', 'Decision có thể đến từ scenario hoặc blocklist.', 'sudo cscli decisions list --ip IP_ADDRESS\nsudo cscli alerts list --ip IP_ADDRESS\nsudo cscli decisions delete --ip IP_ADDRESS\nsudo cscli allowlists list', 'Chỉ xóa decision sau khi xác minh IP. Dùng allowlist hẹp, có lý do và thời hạn review.'],
      ['Fail2ban', 'Jail không bắt log', 'Sai logpath/backend, regex không match hoặc jail chưa enable.', 'sudo fail2ban-client status\nsudo fail2ban-client status sshd\nsudo fail2ban-regex /var/log/auth.log /etc/fail2ban/filter.d/sshd.conf\nsudo tail -200 /var/log/fail2ban.log\nsudo journalctl -u fail2ban -n 200 --no-pager', 'Ubuntu mới có thể dùng backend systemd thay vì auth.log. Kiểm tra jail.local.'],
      ['SSH', 'Không đăng nhập được', 'Sai key/permission, firewall, ban, AllowUsers hoặc sshd config.', 'ssh -vvv USER@HOST\nsudo sshd -t\nsudo journalctl -u ssh -b -n 200 --no-pager\nsudo tail -200 /var/log/auth.log 2>/dev/null\nnamei -l /home/USER/.ssh/authorized_keys\nsudo ufw status numbered', 'Test sshd -t và mở phiên mới trước khi reload; giữ console provider/Tailscale làm đường lui.'],
      ['Firewall', 'Port bị chặn hoặc mở nhầm', 'So sánh socket listen với UFW/nftables và đường mạng thực tế.', 'sudo ss -ltnup\nsudo ufw status numbered\nsudo nft list ruleset\nsudo journalctl -k --since "1 hour ago" | grep -iE "DROP|REJECT|UFW"\nsudo tail -100 /var/log/ufw.log 2>/dev/null', 'Không chạy ufw reset, iptables -F hoặc nft flush ruleset trên máy từ xa.']
    ]
  },
  {
    id: 'fixcontainer', no: 'F05', title: 'Docker & Kubernetes', sub: 'Container, image, network, volume', eyebrow: 'Container troubleshooting', h2: 'Fix lỗi Docker, Compose và Kubernetes theo trạng thái runtime',
    lead: 'Giữ lại exit code, event và log --previous trước khi recreate workload.',
    rows: [
      ['Docker', 'Container exit/restart loop', 'Command crash, env thiếu, OOM, permission volume hoặc healthcheck fail.', 'docker ps -a\ndocker inspect CONTAINER --format "{{json .State}}"\ndocker logs --timestamps --tail=300 CONTAINER\ndocker inspect CONTAINER --format "OOM={{.State.OOMKilled}} Exit={{.State.ExitCode}}"\ndocker events --since 1h', 'Không docker compose down trước khi lấy log/inspect. Kiểm tra restart policy và exit code.'],
      ['Docker', 'Daemon hoặc pull lỗi', 'Docker daemon, disk, DNS, registry auth hoặc rate limit.', 'systemctl status docker containerd --no-pager -l\njournalctl -u docker -b -n 250 --no-pager\ndocker info\ndocker system df\ndocker pull IMAGE:TAG\ngetent hosts registry-1.docker.io', 'Không prune -a khi chưa kiểm tra image/volume đang cần cho rollback.'],
      ['Compose', 'Service không nói chuyện được', 'Sai service name, network, internal port hoặc env.', 'docker compose ps\ndocker compose config\ndocker compose logs --tail=250 SERVICE\ndocker compose exec SERVICE getent hosts OTHER_SERVICE\ndocker network inspect NETWORK', 'Trong container, localhost là chính container đó; dùng service name cho dependency.'],
      ['Kubernetes', 'CrashLoopBackOff', 'Đọc describe, log hiện tại và log lần chạy trước.', 'kubectl get pods -A -o wide\nkubectl describe pod POD -n NS\nkubectl logs POD -n NS --all-containers --tail=250\nkubectl logs POD -n NS --previous\nkubectl get events -n NS --sort-by=.lastTimestamp | tail -80', 'Đừng xóa pod trước khi lấy event/log. Kiểm tra probe, secret, configmap và resource limit.'],
      ['Kubernetes', 'Service/Ingress không vào được', 'Selector, endpoint, targetPort, ingress class, TLS hoặc network policy.', 'kubectl get svc,endpoints,endpointslices -n NS\nkubectl get pods -n NS --show-labels\nkubectl describe ingress INGRESS -n NS\nkubectl get networkpolicy -A\nkubectl run curltest --rm -it --image=curlimages/curl -- curl -v http://SERVICE.NS.svc:PORT', 'Đi từ pod → service → ingress → external LB; xác minh từng hop.']
    ]
  },
  {
    id: 'fixdata', no: 'F06', title: 'Database & Redis', sub: 'Postgres, MySQL, cache, lock', eyebrow: 'Data service recovery', h2: 'Fix PostgreSQL, MySQL và Redis có kiểm soát dữ liệu',
    lead: 'Trước repair hoặc xóa dữ liệu phải biết backup gần nhất, RPO/RTO và đường rollback.',
    rows: [
      ['PostgreSQL', 'Service hoặc kết nối lỗi', 'Kiểm tra readiness, journal, port, auth và vị trí log thật từ config.', 'pg_isready\nsystemctl status postgresql --no-pager -l\njournalctl -u postgresql -b -n 250 --no-pager\nsudo -u postgres psql -c "show log_directory; show log_filename; show hba_file;"\nsudo ss -ltnp | grep 5432', 'Log thường ở journal hoặc /var/log/postgresql; hỏi SHOW để xác nhận theo cluster.'],
      ['PostgreSQL', 'Lock/query chậm/kết nối đầy', 'Tìm session, wait event, lock và query lâu trước khi kill.', 'sudo -u postgres psql -c "select state,count(*) from pg_stat_activity group by 1;"\nsudo -u postgres psql -c "select pid,wait_event_type,wait_event,now()-query_start age,left(query,120) from pg_stat_activity where state<>\x27idle\x27 order by query_start;"\nsudo -u postgres psql -c "select * from pg_locks where not granted;"', 'Chỉ terminate đúng session sau khi đánh giá transaction và ứng dụng; điều chỉnh pool thay vì tăng max mù.'],
      ['MySQL', 'Service/query lỗi', 'Kiểm tra ping, error log, processlist và InnoDB status.', 'mysqladmin ping\nsystemctl status mysql --no-pager -l\njournalctl -u mysql -b -n 250 --no-pager\nmysql -NBe "select @@log_error; show full processlist;"\nmysql -e "show engine innodb status\\G"', 'Error log thường ở /var/log/mysql/error.log nhưng phải hỏi @@log_error để chắc chắn.'],
      ['Redis', 'Cache không phản hồi hoặc đầy RAM', 'Kiểm tra ping, memory, client, persistence và log.', 'redis-cli ping\nredis-cli info memory\nredis-cli info clients\nredis-cli info persistence\nredis-cli slowlog get 20\nsystemctl status redis-server --no-pager -l\njournalctl -u redis-server -b -n 200 --no-pager', 'Không FLUSHALL. Xác nhận eviction policy, maxmemory và vai trò cache hay source of truth.'],
      ['Backup DB', 'Không chắc backup dùng được', 'Kiểm tra tuổi file, checksum và restore sang database test.', 'find /backup -type f -mtime -2 -ls\nsha256sum /backup/DB.dump\ncreatedb restore_verify\npg_restore --list /backup/DB.dump | head\npg_restore -d restore_verify /backup/DB.dump', 'Không restore đè production. Ghi thời gian restore thực để so với RTO.']
    ]
  },
  {
    id: 'fixnetwork', no: 'F07', title: 'Network, DNS & Tunnel', sub: 'Route, resolver, Tailscale', eyebrow: 'Network path debugging', h2: 'Fix mạng, DNS, route, Tailscale và tunnel',
    lead: 'Kiểm tra từ link, IP, route, DNS, TCP tới HTTP; không dùng ping thành công để kết luận ứng dụng khỏe.',
    rows: [
      ['Network', 'Mất kết nối', 'Xác nhận interface, địa chỉ, route, gateway và packet loss.', 'ip -br link\nip -br addr\nip route\nip route get 1.1.1.1\nping -c 4 GATEWAY\nmtr -rwzc 20 DESTINATION', 'MTR/ICMP có thể bị rate-limit. Kết hợp kiểm tra TCP tới đúng port dịch vụ.'],
      ['DNS', 'Resolve sai hoặc chậm', 'So sánh resolver local, public và authoritative.', 'resolvectl status\nresolvectl query DOMAIN\ndig DOMAIN\ndig DOMAIN @1.1.1.1\ndig +trace DOMAIN\ndig +short NS DOMAIN', 'Kiểm tra A và AAAA; bản ghi AAAA sai có thể làm client IPv6 lỗi dù IPv4 đúng.'],
      ['TCP', 'Port timeout/refused', 'Refused thường không có listener; timeout thường do route/firewall.', 'sudo ss -ltnup\nnc -vz HOST PORT\ncurl -v --connect-timeout 5 http://HOST:PORT\nsudo tcpdump -ni any host HOST and port PORT', 'Tcpdump có thể chứa dữ liệu nhạy cảm; giới hạn host/port và thời gian capture.'],
      ['Tailscale', 'Node offline hoặc không truy cập được', 'Kiểm tra daemon, login, peer, route và policy.', 'systemctl status tailscaled --no-pager -l\njournalctl -u tailscaled -b -n 250 --no-pager\ntailscale status\ntailscale netcheck\ntailscale ping PEER\ntailscale ip -4', 'Kiểm tra ACL và subnet route trong admin console; không đăng auth key vào log/ticket.'],
      ['Cloudflared', 'Tunnel có connector nhưng route lỗi', 'Ingress rule sai hostname/service hoặc origin nội bộ chết.', 'cloudflared tunnel info TUNNEL_NAME\ncloudflared tunnel ingress validate\ncloudflared tunnel ingress rule https://DOMAIN\njournalctl -u cloudflared -b -n 200 --no-pager\ncurl -v http://127.0.0.1:ORIGIN_PORT', 'Validate config rồi test origin local; Cloudflare edge sống không có nghĩa origin sống.']
    ]
  },
  {
    id: 'fixresource', no: 'F08', title: 'Disk, RAM & hiệu năng', sub: 'Full disk, inode, OOM, I/O', eyebrow: 'Resource incidents', h2: 'Fix disk đầy, hết inode, OOM và nghẽn tài nguyên',
    lead: 'Phân biệt capacity, saturation và leak trước khi dọn hoặc nâng tài nguyên.',
    rows: [
      ['Disk', 'No space left on device', 'Có thể hết dung lượng, inode hoặc file đã xóa vẫn bị process giữ.', 'df -hT\ndf -ih\nsudo du -xhd1 /var | sort -h\nsudo find /var/log -type f -printf "%s %p\\n" | sort -n | tail -30\nsudo lsof +L1', 'Không xóa data/database. Nếu deleted file còn mở, restart đúng process sau khi đánh giá ảnh hưởng.'],
      ['Journal', 'Log chiếm quá nhiều disk', 'Đo journal và retention trước khi vacuum.', 'journalctl --disk-usage\ngrep -R "SystemMaxUse\|MaxRetentionSec" /etc/systemd/journald.conf /etc/systemd/journald.conf.d 2>/dev/null\nsudo journalctl --vacuum-time=14d', 'Đặt retention phù hợp và chuyển log quan trọng sang nơi tập trung trước khi dọn.'],
      ['Memory', 'OOM hoặc swap cao', 'Tìm OOM killer, process tăng RAM và cgroup limit.', 'free -h\nvmstat 1 10\nps aux --sort=-%mem | head -25\njournalctl -k -g "Out of memory|Killed process" --since "24 hours ago"\nsystemd-cgtop\ndocker stats --no-stream', 'Restart chỉ khôi phục tạm. Cần tìm leak, giới hạn, traffic và working set thực.'],
      ['I/O', 'Máy chậm do disk', 'Đo latency, utilization, queue và process tạo I/O.', 'iostat -xz 1 10\npidstat -d 1 10\niotop -oPa\nlsblk -o NAME,FSTYPE,SIZE,ROTA,MOUNTPOINTS\ndmesg -T | grep -iE "I/O error|nvme|ext4|xfs" | tail -80', 'Nếu có I/O error phần cứng, ưu tiên backup/snapshot và kế hoạch thay disk thay vì benchmark.'],
      ['CPU', 'Load cao', 'Load có thể do CPU, I/O wait hoặc task uninterruptible.', 'uptime\nmpstat -P ALL 1 10\nvmstat 1 10\nps -eo state,pid,ppid,cmd,%cpu,%mem --sort=-%cpu | head -30\npidstat -u -w 1 10', 'Xem %wa và process trạng thái D; không kết luận chỉ từ load average.']
    ]
  },
  {
    id: 'fixobserve', no: 'F09', title: 'Log & Monitoring', sub: 'Prometheus, Grafana, Loki, alert', eyebrow: 'Observability debugging', h2: 'Tìm đúng log và fix hệ thống giám sát',
    lead: 'Nếu không có evidence thì chưa thể khẳng định nguyên nhân. Mục này chỉ rõ nơi lấy log và cách kiểm tra pipeline quan sát.',
    rows: [
      ['Logs', 'Bản đồ log hệ thống', 'Journal cho systemd; auth, kernel, Nginx và app có nguồn riêng.', 'journalctl -b -p warning --no-pager\njournalctl -u SERVICE --since "1 hour ago" --no-pager\ntail -100 /var/log/auth.log 2>/dev/null\ntail -100 /var/log/syslog 2>/dev/null\ntail -100 /var/log/nginx/error.log 2>/dev/null\nfind /var/log -type f -mmin -60 -ls | head -100', 'Đường log thay đổi theo distro/config. Xem unit và config ứng dụng để xác nhận.'],
      ['Prometheus', 'Không scrape được target', 'Kiểm tra ready, targets API, config và kết nối từ Prometheus.', 'curl -fsS http://127.0.0.1:9090/-/ready\ncurl -s http://127.0.0.1:9090/api/v1/targets | head -c 3000\npromtool check config /etc/prometheus/prometheus.yml\njournalctl -u prometheus -b -n 200 --no-pager', 'Target UP chỉ xác nhận scrape; cần alert theo metric chức năng của ứng dụng.'],
      ['Grafana', 'Dashboard không có dữ liệu', 'Kiểm tra health, datasource, time range và query.', 'curl -fsS http://127.0.0.1:3000/api/health\nsystemctl status grafana-server --no-pager -l\njournalctl -u grafana-server -b -n 200 --no-pager\ngrep -nE "datasources|url:" /etc/grafana/provisioning/datasources/*.yml 2>/dev/null', 'Log thường ở journal hoặc /var/log/grafana/grafana.log theo config.'],
      ['Loki', 'Log không vào Loki', 'Kiểm tra Loki ready, agent/Promtail, positions và quyền đọc file.', 'curl -fsS http://127.0.0.1:3100/ready\nsystemctl status loki promtail --no-pager -l\njournalctl -u loki -u promtail -b -n 250 --no-pager\ngrep -nE "positions|__path__|clients" /etc/promtail/config.yml', 'Nếu dùng Docker Compose, thay journal bằng docker compose logs loki promtail.'],
      ['Alertmanager', 'Alert không gửi', 'Kiểm tra ready, route, receiver, silence và log delivery.', 'curl -fsS http://127.0.0.1:9093/-/ready\namtool check-config /etc/alertmanager/alertmanager.yml\namtool alert query\namtool silence query\njournalctl -u alertmanager -b -n 200 --no-pager', 'Không đưa webhook token vào output chia sẻ. Gửi test alert có nhãn route đúng.']
    ]
  },
  {
    id: 'fixbackup', no: 'F10', title: 'Backup, Job & khôi phục', sub: 'Cron, timer, checksum, restore', eyebrow: 'Recovery operations', h2: 'Fix backup lỗi và chứng minh có thể khôi phục',
    lead: 'Backup chỉ được coi là thành công khi tìm thấy file đúng tuổi, checksum hợp lệ và restore test qua.',
    rows: [
      ['Systemd', 'Timer không chạy', 'Kiểm tra lịch, lần chạy gần nhất, unit và journal.', 'systemctl list-timers --all\nsystemctl status backup.timer backup.service --no-pager -l\njournalctl -u backup.service --since "7 days ago" --no-pager\nsystemctl cat backup.timer backup.service', 'Kiểm tra Persistent=true nếu muốn chạy bù sau khi máy tắt.'],
      ['Cron', 'Cron job im lặng', 'Cron có PATH/env tối thiểu, user khác và output có thể gửi mail/syslog.', 'crontab -l\nsudo crontab -l\ngrep -R "backup" /etc/cron* 2>/dev/null\njournalctl -u cron --since "24 hours ago" --no-pager\ngrep CRON /var/log/syslog | tail -100', 'Dùng đường dẫn tuyệt đối, redirect log và ghi exit code. Chạy thử bằng đúng user của cron.'],
      ['Storage', 'Backup không tạo được file', 'Đích đầy, mount mất, permission hoặc credential hết hạn.', 'findmnt /backup\ndf -h /backup\ndf -ih /backup\nnamei -l /backup\nsudo -u BACKUP_USER test -w /backup && echo writable\nfind /backup -type f -mtime -2 -ls | head -50', 'Nếu mount mất, job có thể ghi vào root filesystem; kiểm tra findmnt trước khi chạy lại.'],
      ['Integrity', 'File backup có nhưng chưa chắc dùng được', 'Kiểm tra checksum, cấu trúc archive và tuổi dữ liệu.', 'sha256sum -c /backup/SHA256SUMS\ntar -tzf /backup/site.tar.gz | head -50\ngzip -t /backup/site.tar.gz\nstat /backup/site.tar.gz', 'Không chỉ nhìn dung lượng file. Lưu checksum tách biệt và cảnh báo khi backup quá tuổi.'],
      ['Restore', 'Diễn tập khôi phục', 'Restore vào môi trường tách biệt, đo RTO và kiểm tra chức năng/dữ liệu.', 'mkdir -p /restore-test\ntar -xzf /backup/site.tar.gz -C /restore-test\nfind /restore-test -maxdepth 2 -type f | head\n# Khôi phục DB vào database test, không đè production\npg_restore --list /backup/database.dump | head -50', 'Ghi start/end time, version, số bản ghi, checksum và lỗi. Xóa môi trường test sau khi lưu evidence.']
    ]
  }
);
const moduleNav = document.querySelector('.module-tabs');
const moduleStage = document.querySelector('.module-stage');
const renderRows = (rows, tableClass = '') => rows.map((row, index) => `<tr data-tags="${row.join(' ').replace(/"/g, '&quot;').toLowerCase()}"><td><span class="row-index">${String(index + 1).padStart(2, '0')}</span><strong>${row[0]}</strong></td><td>${row[1]}</td><td>${row[2]}</td><td><pre><code>${row[3].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre></td><td>${row[4]}</td></tr>`).join('');
const createFeaturePanel = (item) => `<article class="module-panel feature-pack-panel" data-panel="${item.id}">
  <p class="eyebrow">${item.eyebrow}</p><h2>${item.h2}</h2><p class="lead">${item.lead}</p>
  <div class="course-framework"><div class="course-head"><p class="eyebrow">Master workflow</p><h3>${item.title}: cách học và áp dụng</h3><p>Đọc khái niệm, thực hành lệnh, lưu checklist, rồi dùng khi xử lý incident thật.</p></div><div class="course-grid">
    <section><span>01</span><h4>Hiểu triệu chứng</h4><p>Xác định người dùng bị ảnh hưởng, thời điểm bắt đầu, phạm vi lỗi và bằng chứng đầu tiên.</p></section>
    <section><span>02</span><h4>Kiểm tra bằng lệnh</h4><p>Chạy lệnh đọc trạng thái, log, metric. Không thay đổi cấu hình khi chưa có giả thuyết rõ.</p></section>
    <section><span>03</span><h4>Khôi phục an toàn</h4><p>Ưu tiên restore dịch vụ, rollback hoặc giảm tải. Ghi lại mọi thao tác quan trọng.</p></section>
    <section><span>04</span><h4>Phòng tránh tái diễn</h4><p>Viết RCA, bổ sung alert, test backup/rollback, cập nhật runbook và checklist production.</p></section>
  </div></div>
  <div class="master-handbook"><div class="handbook-head"><p class="eyebrow">Reference table</p><h3>Bảng master ${item.title}</h3><p>Dùng tìm kiếm bên phải để nhảy nhanh tới lỗi/lệnh/checklist. Bấm đúp vào ô lệnh màu đen để copy.</p></div><div class="master-table-wrap"><table class="master-table feature-master-table"><thead><tr><th>Nhóm</th><th>Mục tiêu</th><th>Cách hiểu</th><th>Câu lệnh</th><th>Lưu ý production</th></tr></thead><tbody>${renderRows(item.rows)}</tbody></table></div></div>
</article>`;
const installFeatureModules = () => {
  if (!moduleNav || !moduleStage || document.querySelector('[data-module="errors"]')) return;
  featureModules.forEach((item) => {
    const tab = document.createElement('button');
    tab.className = 'module-tab';
    tab.type = 'button';
    tab.dataset.module = item.id;
    tab.innerHTML = `<span>${item.no}</span><strong>${item.title}</strong><small>${item.sub}</small>`;
    tab.addEventListener('click', () => activateModule(item.id));
    moduleNav.appendChild(tab);
    moduleTabs.push(tab);
    moduleStage.insertAdjacentHTML('beforeend', createFeaturePanel(item));
    const panel = moduleStage.querySelector(`[data-panel="${item.id}"]`);
    if (panel) modulePanels.push(panel);
  });
  Object.assign(suiteProfiles, {
    errors: ['Symptom', 'Evidence', 'Fix', 'Prevention'],
    runbook: ['Detect', 'Contain', 'Recover', 'RCA'],
    cheatsheet: ['Find', 'Run', 'Verify', 'Save'],
    production: ['Access', 'Runtime', 'Observe', 'Recover']
  });
  enhanceRows();
  buildAllSuites();
  upgradeSuiteBooksAndTutors();
  renderQuickLookup(localStorage.getItem('learnit:active-module') || 'linux');
  renderProgress();
  renderFavorites();
};
installFeatureModules();

const installLearningStatus = () => {
  document.querySelectorAll('.master-table tbody tr').forEach((row) => {
    if (row.dataset.statusReady) return;
    row.dataset.statusReady = '1';
    const first = row.querySelector('td');
    if (!first) return;
    const key = rowKey(row, 'study-status');
    const select = document.createElement('select');
    select.className = 'study-status';
    ['Chưa học', 'Đang học', 'Đã hiểu', 'Cần ôn'].forEach((label) => {
      const option = document.createElement('option');
      option.value = label;
      option.textContent = label;
      select.append(option);
    });
    select.value = localStorage.getItem(key) || 'Chưa học';
    select.addEventListener('change', () => {
      localStorage.setItem(key, select.value);
      showToast(`Trạng thái: ${select.value}`);
    });
    first.append(select);
  });
};
installLearningStatus();

const ensureCommandFinder = () => {
  if (document.querySelector('.command-finder-jump') || !globalSearch) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'command-finder-jump';
  btn.textContent = 'Tìm lệnh';
  btn.addEventListener('click', () => {
    globalSearch.focus();
    globalSearch.placeholder = 'Nhập lệnh hoặc lỗi: docker logs, 502, kubectl, disk full...';
    showToast('Gõ lệnh/lỗi để tìm toàn bộ LearnIT.');
  });
  document.querySelector('.top-actions')?.insertBefore(btn, document.querySelector('.progress-pill'));
};
ensureCommandFinder();


/* LEARNIT_STUDY_TOOLS_20260719_30 */
const installModuleToc = () => {
  modulePanels.forEach((panel) => {
    if (panel.querySelector('.module-toc')) return;
    const title = moduleTabs.find((tab) => tab.dataset.module === panel.dataset.panel)?.querySelector('strong')?.textContent || panel.dataset.panel;
    const targets = [
      ['Tổng quan', panel.querySelector('.lead')],
      ['Chương học', panel.querySelector('.deep-suite [data-suite-panel="chapter"]') || panel.querySelector('.deep-suite')],
      ['Sách học dài', panel.querySelector('.deep-suite [data-suite-panel="book"]')],
      ['Bảng lệnh', panel.querySelector('.master-table-wrap') || panel.querySelector('.command-list')],
      ['Lab', panel.querySelector('.deep-suite [data-suite-panel="lab"]') || panel.querySelector('.command-pack')],
      ['Quiz', panel.querySelector('.deep-suite [data-suite-panel="quiz"]')],
      ['AI Tutor', panel.querySelector('.deep-suite [data-suite-panel="tutor"]')]
    ].filter((item) => item[1]);
    if (!targets.length) return;
    const toc = document.createElement('nav');
    toc.className = 'module-toc';
    toc.setAttribute('aria-label', `Mục lục ${title}`);
    toc.innerHTML = `<div><span class="eyebrow">Module map</span><strong>Mục lục nhanh</strong></div><div class="module-toc-actions"></div>`;
    const actions = toc.querySelector('.module-toc-actions');
    targets.forEach(([label, target]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => {
        const suitePanel = target.closest?.('.suite-panel');
        const suite = target.closest?.('.deep-suite');
        if (suitePanel && suite) {
          const tab = suite.querySelector(`[data-suite="${suitePanel.dataset.suitePanel}"]`);
          tab?.click();
        }
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.classList.remove('lookup-focus');
        void target.offsetWidth;
        target.classList.add('lookup-focus');
        window.setTimeout(() => target.classList.remove('lookup-focus'), 1800);
      });
      actions.appendChild(button);
    });
    const insertAfter = panel.querySelector('.lead') || panel.querySelector('h2');
    if (insertAfter?.nextSibling) insertAfter.parentNode.insertBefore(toc, insertAfter.nextSibling);
    else panel.prepend(toc);
  });
};
installModuleToc();

const finalQuizQuestions = [
  ['Khi website trả 502, kiểm tra đầu tiên nên là gì?', 'Kiểm tra upstream/app và log Nginx', ['Xóa cache trình duyệt', 'Kiểm tra upstream/app và log Nginx', 'Đổi DNS ngay', 'Restart database ngay'], '502 thường là Nginx không nói chuyện được với upstream, nên phải kiểm tra app/socket/port/log.'],
  ['Disk báo đầy nhưng du không thấy file lớn, khả năng nào hay gặp?', 'Process còn giữ file đã xóa', ['Sai múi giờ', 'Process còn giữ file đã xóa', 'DNS cache', 'Thiếu SSL'], 'Dùng lsof +L1 để tìm file đã xóa nhưng vẫn bị process giữ descriptor.'],
  ['Trong production, backup đáng tin khi nào?', 'Đã restore test thành công', ['Có file backup là đủ', 'Đã restore test thành công', 'Backup nằm cùng ổ production', 'Tên file có ngày tháng'], 'Backup chưa từng restore thử thì chưa chứng minh được khả năng phục hồi.'],
  ['Kubernetes CrashLoopBackOff nên xem gì?', 'kubectl logs --previous và describe pod', ['kubectl delete namespace', 'kubectl logs --previous và describe pod', 'Tăng replica ngay', 'Đổi service type'], 'Container restart liên tục nên log hiện tại có thể rỗng; logs --previous và events rất quan trọng.'],
  ['CI/CD tốt cần có gì trước deploy?', 'Test, build, scan, kiểm soát secret và rollback path', ['Chỉ cần git pull', 'Test, build, scan, kiểm soát secret và rollback path', 'Tắt monitoring', 'Deploy bằng tay không log'], 'Pipeline là cơ chế kiểm soát thay đổi, không chỉ là tự động copy file.'],
  ['Lệnh nguy hiểm như rm -rf nên xử lý thế nào?', 'Xác nhận path, backup/snapshot và hiểu phạm vi trước khi chạy', ['Chạy nhanh cho xong', 'Xác nhận path, backup/snapshot và hiểu phạm vi trước khi chạy', 'Luôn chạy bằng root', 'Tắt log trước'], 'Lệnh destructive cần guardrail vì sai path có thể mất dữ liệu.'],
  ['Monitoring tốt bắt đầu từ đâu?', 'Câu hỏi vận hành và SLO/alert có runbook', ['Dashboard thật nhiều màu', 'Câu hỏi vận hành và SLO/alert có runbook', 'Chỉ lưu log local', 'Chỉ xem CPU'], 'Dashboard chỉ có giá trị khi trả lời được hệ thống sống/chậm/lỗi/ảnh hưởng ai.'],
  ['Secret production không nên để ở đâu?', 'Trong Git hoặc file public', ['Trong Vault', 'Trong Git hoặc file public', 'Trong biến môi trường được phân quyền', 'Trong secret manager'], 'Secret leak phải rotate, không chỉ xóa file.'],
  ['Khi deploy lỗi, hành động đúng là gì?', 'Rollback version ổn, verify health, giữ bằng chứng để RCA', ['Sửa nhiều thứ cùng lúc', 'Rollback version ổn, verify health, giữ bằng chứng để RCA', 'Xóa log', 'Tăng timeout vô hạn'], 'Khôi phục dịch vụ trước, sau đó phân tích nguyên nhân gốc.'],
  ['CCNA troubleshooting nên đi theo lớp nào?', 'Physical, L2, IP, routing, service, security', ['App, app, app', 'Physical, L2, IP, routing, service, security', 'Chỉ đổi IP', 'Chỉ reset router'], 'Đi theo mô hình phân lớp giúp không bỏ sót nguyên nhân.'],
  ['Nginx reload trước khi làm gì?', 'nginx -t', ['rm access.log', 'nginx -t', 'reboot server', 'disable firewall'], 'Luôn test config trước reload để tránh làm sập web.'],
  ['Terraform production cần bảo vệ gì nhất?', 'State file và secret trong state', ['Tên workspace', 'State file và secret trong state', 'Màu output', 'Số dòng code'], 'State có thể chứa dữ liệu nhạy cảm và quyết định hạ tầng thật.']
];
const installFinalQuiz = () => {
  if (!moduleNav || !moduleStage || document.querySelector('[data-module="finalquiz"]')) return;
  const tab = document.createElement('button');
  tab.className = 'module-tab';
  tab.type = 'button';
  tab.dataset.module = 'finalquiz';
  tab.innerHTML = '<span>42</span><strong>Kiểm tra tổng hợp</strong><small>DevOps, DevSecOps, incident, production</small>';
  tab.addEventListener('click', () => activateModule('finalquiz'));
  moduleNav.appendChild(tab);
  moduleTabs.push(tab);
  const questions = finalQuizQuestions.map((q, index) => `<section class="final-question" data-answer="${q[1].replace(/"/g, '&quot;')}" data-explain="${q[3].replace(/"/g, '&quot;')}"><h3>${String(index + 1).padStart(2, '0')}. ${q[0]}</h3><div class="final-options">${q[2].map((op) => `<label><input type="radio" name="finalquiz-${index}" value="${op.replace(/"/g, '&quot;')}">${op}</label>`).join('')}</div><p class="final-explain"></p></section>`).join('');
  moduleStage.insertAdjacentHTML('beforeend', `<article class="module-panel final-quiz-panel" data-panel="finalquiz"><p class="eyebrow">Final assessment</p><h2>Bài kiểm tra tổng hợp DevOps / DevSecOps</h2><p class="lead">Bài này gom các tình huống quan trọng nhất: web lỗi, Linux, Docker, Kubernetes, CI/CD, backup, monitoring, security và production readiness. Làm xong sẽ biết phần nào cần ôn lại.</p><nav class="module-toc"><div><span class="eyebrow">Exam mode</span><strong>Kiểm tra năng lực</strong></div><div class="module-toc-actions"><button type="button" class="final-start">Bắt đầu</button><button type="button" class="final-reset">Làm lại</button></div></nav><div class="final-score-card"><strong>Điểm hiện tại</strong><span id="final-score">0/${finalQuizQuestions.length}</span><small>Chưa chấm điểm</small></div><div class="final-question-list">${questions}</div><div class="final-actions"><button type="button" class="final-submit">Chấm điểm</button><button type="button" class="final-review-wrong">Xem câu cần ôn</button></div></article>`);
  const panel = moduleStage.querySelector('[data-panel="finalquiz"]');
  modulePanels.push(panel);
  panel.querySelector('.final-submit')?.addEventListener('click', () => {
    let score = 0;
    const wrong = [];
    panel.querySelectorAll('.final-question').forEach((question, index) => {
      const picked = question.querySelector('input:checked')?.value || '';
      const ok = picked === question.dataset.answer;
      question.classList.toggle('is-correct', ok);
      question.classList.toggle('is-wrong', Boolean(picked) && !ok);
      if (ok) score += 1;
      else wrong.push(index + 1);
      const explain = question.querySelector('.final-explain');
      if (explain) explain.textContent = `${ok ? 'Đúng.' : picked ? 'Chưa đúng.' : 'Chưa chọn.'} Đáp án: ${question.dataset.answer}. ${question.dataset.explain}`;
    });
    const scoreEl = panel.querySelector('#final-score');
    if (scoreEl) scoreEl.textContent = `${score}/${finalQuizQuestions.length}`;
    panel.querySelector('.final-score-card small').textContent = score >= 10 ? 'Nền tảng rất ổn, tiếp tục lab production.' : score >= 7 ? 'Ổn, nhưng cần ôn lại các câu sai.' : 'Cần ôn lại runbook, Linux, Docker/K8s và production checklist.';
    localStorage.setItem('learnit:finalquiz:lastscore', String(score));
    showToast(`Điểm tổng hợp: ${score}/${finalQuizQuestions.length}`);
  });
  panel.querySelector('.final-review-wrong')?.addEventListener('click', () => {
    const wrong = Array.from(panel.querySelectorAll('.final-question.is-wrong, .final-question:not(.is-correct)'))[0];
    if (wrong) focusTarget(wrong);
    else showToast('Không có câu sai sau lần chấm gần nhất.');
  });
  panel.querySelector('.final-reset')?.addEventListener('click', () => {
    panel.querySelectorAll('input[type="radio"]').forEach((input) => { input.checked = false; });
    panel.querySelectorAll('.final-question').forEach((q) => q.classList.remove('is-correct', 'is-wrong'));
    panel.querySelectorAll('.final-explain').forEach((p) => { p.textContent = ''; });
    panel.querySelector('#final-score').textContent = `0/${finalQuizQuestions.length}`;
    panel.querySelector('.final-score-card small').textContent = 'Đã reset bài kiểm tra';
  });
  panel.querySelector('.final-start')?.addEventListener('click', () => panel.querySelector('.final-question')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  renderQuickLookup(localStorage.getItem('learnit:active-module') || 'linux');
  renderProgress();
};
installFinalQuiz();

const dangerousCommandPattern = /\b(rm\s+-rf|mkfs\.|dd\s+if=|:>\s*\/|iptables\s+-F|ufw\s+enable|firewall-cmd\s+--reload|kubectl\s+delete|docker\s+compose\s+down|docker\s+system\s+prune|DROP\s+DATABASE|TRUNCATE\s+TABLE|shutdown|reboot)\b/i;
document.addEventListener('dblclick', async (event) => {
  const codeBox = event.target.closest('pre');
  const text = codeBox?.querySelector('code')?.textContent?.trim() || '';
  if (!text || !dangerousCommandPattern.test(text)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  codeBox.classList.add('danger-copy');
  const ok = window.confirm('Cảnh báo: ô này có lệnh nguy hiểm/destructive. Chỉ copy khi bạn đã hiểu path, target, backup/rollback và phạm vi ảnh hưởng. Vẫn copy chứ?');
  window.setTimeout(() => codeBox.classList.remove('danger-copy'), 1600);
  if (!ok) {
    showToast('Đã hủy copy lệnh nguy hiểm.');
    return;
  }
  try {
    await copyTextWithFallback(text);
    codeBox.classList.add('copy-focus');
    window.setTimeout(() => codeBox.classList.remove('copy-focus'), 1200);
    showToast('Đã copy sau khi xác nhận cảnh báo.');
  } catch (_error) {
    showToast('Không thể copy tự động.');
  }
}, true);

installModuleToc();

/* === STANDALONE Q&A ANSWER DISPLAY (safety net) === */
const installQaToggle = () => {
  document.querySelectorAll(".lpic-qa-table, .ccna-qa-table").forEach((table) => {
    if (table.dataset.qaReady === "1") return;
    table.dataset.qaReady = "1";
    table.querySelectorAll("tbody tr").forEach((row) => {
      if (row.dataset.qaEnhanced) return;
      row.dataset.qaEnhanced = "1";
      row.classList.add("qa-hidden");
      const pre = row.querySelector("pre");
      if (pre) {
        pre.style.cursor = "pointer";
        pre.title = "Bấm để hiện/ẩn đáp án";
        pre.addEventListener("click", (e) => {
          e.stopPropagation();
          row.classList.toggle("qa-hidden");
          row.classList.toggle("qa-visible");
        });
      }
    });
  });
};
installQaToggle();

/* Dynamic answer blocks are rendered after the page has loaded. Handle them at
   document level so every current and future "Xem đáp án" control responds. */
document.addEventListener('click', (event) => {
  const answerButton = event.target.closest('.path-answer-toggle');
  if (answerButton) {
    event.preventDefault();
    event.stopPropagation();
    const item = answerButton.closest('.path-check-item');
    if (!item) return;
    const isOpen = !item.classList.contains('is-open');
    item.classList.toggle('is-open', isOpen);
    answerButton.textContent = isOpen ? 'Ẩn đáp án' : 'Xem đáp án';
    answerButton.setAttribute('aria-expanded', String(isOpen));
    showToast(isOpen ? 'Đã hiện đáp án.' : 'Đã ẩn đáp án.');
    return;
  }

  const answerBox = event.target.closest('.lpic-qa-table pre, .ccna-qa-table pre');
  if (!answerBox) return;
  event.preventDefault();
  event.stopPropagation();
  const row = answerBox.closest('tr');
  if (!row) return;
  const isVisible = !row.classList.contains('qa-visible');
  row.classList.toggle('qa-visible', isVisible);
  row.classList.toggle('qa-hidden', !isVisible);
  answerBox.setAttribute('aria-expanded', String(isVisible));
}, true);
