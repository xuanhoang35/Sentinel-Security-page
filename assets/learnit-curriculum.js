(() => {
  'use strict';

  const pathPhases = [
    {
      id: 'foundation', no: '01', title: 'Nền tảng hệ thống', weeks: 'Tuần 1-4',
      summary: 'Làm chủ Linux, đọc log và xử lý lỗi theo bằng chứng.',
      deliverable: 'Một web service Linux chạy bằng user riêng, có systemd, log và runbook.',
      modules: ['linux', 'bug', 'lpic']
    },
    {
      id: 'network-web', no: '02', title: 'Mạng và Web', weeks: 'Tuần 5-7',
      summary: 'Hiểu đường đi của request từ DNS, IP, switch/router tới Nginx và ứng dụng.',
      deliverable: 'Topology VLAN có routing và một website HTTPS qua reverse proxy.',
      modules: ['ccna', 'cisco', 'nginxweb', 'emaildns']
    },
    {
      id: 'data-container', no: '03', title: 'Dữ liệu và Container', weeks: 'Tuần 8-10',
      summary: 'Vận hành database có backup và đóng gói ứng dụng bằng Docker Compose.',
      deliverable: 'Ứng dụng nhiều service có volume, healthcheck và restore dữ liệu thành công.',
      modules: ['database', 'docker']
    },
    {
      id: 'delivery', no: '04', title: 'Tự động hóa và CI/CD', weeks: 'Tuần 11-14',
      summary: 'Biến thay đổi code thành một quy trình có kiểm tra, phát hành và rollback.',
      deliverable: 'Pipeline test, scan, build, deploy, verify và rollback theo version.',
      modules: ['automation', 'gitops', 'cicd']
    },
    {
      id: 'cloud-platform', no: '05', title: 'Cloud và Orchestration', weeks: 'Tuần 15-18',
      summary: 'Quản hạ tầng bằng code và triển khai workload lên Kubernetes.',
      deliverable: 'Hạ tầng có plan/state và ứng dụng Kubernetes có probe, ingress, rollout.',
      modules: ['cloud', 'terraform', 'kubernetes']
    },
    {
      id: 'reliability', no: '06', title: 'Độ tin cậy hệ thống', weeks: 'Tuần 19-21',
      summary: 'Đo hệ thống, phát hiện lỗi, tối ưu có số liệu và phục hồi khi mất dữ liệu.',
      deliverable: 'Dashboard, alert có runbook, restore drill và báo cáo tải p95/p99.',
      modules: ['monitoring', 'backupdr', 'perf', 'otel', 'architecture']
    },
    {
      id: 'security-track', no: '07', title: 'DevSecOps chuyên sâu', weeks: 'Tuần 22-23',
      summary: 'Bảo vệ từ identity, server, pipeline tới phát hiện và ứng cứu sự cố.',
      deliverable: 'Threat model, baseline hardening, scan pipeline và diễn tập incident.',
      modules: ['securitymindset', 'threatmodel', 'baseline', 'iamaccess', 'vulnmgmt', 'detection', 'incident', 'sectesting', 'compliance', 'humansec', 'attackdefense', 'security', 'vault']
    },
    {
      id: 'master-security', no: '08', title: 'Master Deployment & Security', weeks: 'Tuần 24-34',
      summary: 'Đi sâu vào internals, identity, PKI, network defense, secure platform, supply chain, runtime security và forensics.',
      deliverable: 'Một platform production được harden, có policy, provenance, detection và bộ bằng chứng kiểm soát.',
      modules: ['systeminternals', 'identitypki', 'networkdefense', 'secureplatform', 'supplychain', 'cloudk8ssecurity', 'forensics']
    },
    {
      id: 'recovery-engineering', no: '09', title: 'System Recovery Engineering', weeks: 'Tuần 35-38',
      summary: 'Cứu host từ boot/storage, phục hồi service và data, dựng lại control plane rồi failover/failback có kiểm chứng.',
      deliverable: 'Recovery pack gồm boot rescue, clean-host rebuild, database PITR, etcd restore, DR runbook và kết quả RTO/RPO đo thực tế.',
      modules: ['systemrecovery']
    },
    {
      id: 'capstone', no: '10', title: 'Master Capstone', weeks: 'Tuần 39-40',
      summary: 'Thiết kế, triển khai, bảo vệ, gây lỗi, ứng cứu và bàn giao một hệ thống production hoàn chỉnh.',
      deliverable: 'Hồ sơ kiến trúc, IaC, pipeline, evidence pack, game day, incident report và buổi defense kỹ thuật.',
      modules: ['mesh', 'labs', 'deploy', 'mastercapstone', 'production', 'finalquiz']
    },
    {
      id: 'reference', no: 'REF', title: 'Kho tra cứu', weeks: 'Dùng xuyên suốt',
      summary: 'Mở khi cần lệnh, runbook hoặc hướng xử lý nhanh; không học tuần tự.',
      deliverable: 'Tìm đúng mục theo tình huống và hiểu rủi ro trước khi chạy lệnh.',
      modules: ['commands', 'errors', 'runbook', 'cheatsheet']
    },
    {
      id: 'system-fix', no: 'FIX', title: 'Fix bug hệ thống', weeks: 'Runbook vận hành',
      summary: 'Khoanh vùng lỗi theo từng lớp, đọc đúng log, khôi phục an toàn và xác minh sau sửa.',
      deliverable: 'Xác định thành phần còn sống, tìm đúng log, sửa có rollback và lưu bằng chứng vận hành.',
      modules: ['fixcenter', 'fixhealth', 'fixlinux', 'fixwebedge', 'fixsecurity', 'fixcontainer', 'fixdata', 'fixnetwork', 'fixresource', 'fixobserve', 'fixbackup']
    },
    {
      id: 'master-final', no: 'MASTER', title: 'Master DevOps/DevSecOps', weeks: 'Principal · Architect',
      summary: 'Chiều sâu hệ thống, AppSec, cloud, Kubernetes, SRE, platform engineering, governance và leadership.',
      deliverable: 'Hoàn thành capstone có kiến trúc, automation, security gates, evidence, game day, RCA và buổi defense kỹ thuật.',
      modules: ['masterappsec', 'mastergates', 'masterruntime', 'masterlinuxdeep', 'masternetwork', 'mastercloudarch', 'masterk8sexpert', 'mastersre', 'masterplatform', 'mastersoftware', 'mastergovernance', 'masterleadership', 'mastervalidation']
    },
    {
      id: 'security-master-lab', no: 'SEC', title: 'Security Master Lab', weeks: 'Authorized · Defensive-first',
      summary: 'Cloud Security, Windows/AD, Identity, SIEM/SOAR, DFIR, AI Security và pentest trong lab được cấp phép.',
      deliverable: 'Thực hiện assessment có scope, thu evidence, phát hiện, khắc phục, kiểm thử lại và bàn giao báo cáo an toàn.',
      modules: ['secscope', 'winadsecurity', 'cloudsecuritypro', 'identitysecurity', 'siemsoarintel', 'vulnprogram', 'dfirmastery', 'aisecuritylab', 'webauthorizedlab', 'networkauthorizedlab', 'adauthorizedlab', 'cloudauthorizedlab', 'mobileapisecurity', 'remalwarelab', 'purpleteamcapstone']
    }
  ];

  const pathCoreOrder = [
    'linux', 'bug', 'ccna', 'cisco', 'nginxweb', 'database', 'docker', 'automation',
    'gitops', 'cicd', 'cloud', 'terraform', 'kubernetes', 'monitoring', 'backupdr',
    'perf', 'architecture', 'security', 'systeminternals', 'identitypki', 'networkdefense',
    'secureplatform', 'supplychain', 'cloudk8ssecurity', 'forensics', 'systemrecovery', 'labs', 'deploy',
    'mastercapstone', 'production', 'finalquiz'
  ];

  const pathSupportMeta = {
    lpic: ['24-30 giờ', 'Linux căn bản', 'Hệ thống hóa đủ mục tiêu LPIC-1 và làm được bài lab tương ứng.'],
    cisco: ['10-14 giờ', 'CCNA căn bản', 'Dựng và kiểm tra VLAN, trunk, routing, NAT, DHCP và ACL trên Packet Tracer.'],
    emaildns: ['5-7 giờ', 'DNS và Nginx', 'Cấu hình, kiểm tra SPF, DKIM, DMARC, MX và đọc nguyên nhân mail bị từ chối.'],
    gitops: ['6-8 giờ', 'Git và Kubernetes', 'Quản desired state bằng Git, phát hiện drift và rollback bằng commit.'],
    perf: ['6-8 giờ', 'Linux, database, monitoring', 'Đo baseline, tìm bottleneck và chứng minh cải thiện bằng p95/p99.'],
    otel: ['5-7 giờ', 'Monitoring và microservice', 'Theo một request qua trace, span và liên kết trace_id với log.'],
    architecture: ['6-8 giờ', 'Hoàn thành các phase 1-5', 'Thiết kế hệ thống có trade-off rõ về scale, HA, data, security và chi phí.'],
    securitymindset: ['3 giờ', 'Linux và network', 'Nhìn hệ thống theo tài sản, bề mặt tấn công, quyền và khả năng phục hồi.'],
    threatmodel: ['4 giờ', 'Security mindset', 'Vẽ trust boundary và ưu tiên rủi ro bằng STRIDE.'],
    baseline: ['4 giờ', 'Linux, Nginx', 'Tạo baseline tối thiểu trước production và cách kiểm chứng từng mục.'],
    iamaccess: ['4 giờ', 'Security mindset', 'Thiết kế least privilege, MFA, access review và break-glass.'],
    vulnmgmt: ['4 giờ', 'CI/CD và security', 'Đọc CVE theo mức phơi nhiễm, ưu tiên vá và xác minh sau vá.'],
    detection: ['5 giờ', 'Monitoring', 'Thiết kế log bảo mật, rule có ngữ cảnh và alert có runbook.'],
    incident: ['5 giờ', 'Detection và backup', 'Khoanh vùng, giữ bằng chứng, phục hồi sạch và viết RCA.'],
    sectesting: ['4 giờ', 'Web và CI/CD', 'Lập checklist kiểm thử an toàn trước release mà không phá production.'],
    compliance: ['3 giờ', 'IAM và logging', 'Quản retention, access review, change record và bằng chứng kiểm soát.'],
    humansec: ['2 giờ', 'Không', 'Giảm rủi ro phishing, lộ mật khẩu và thất thoát thiết bị.'],
    attackdefense: ['8-10 giờ', 'Security track', 'Nối dấu hiệu tấn công với lớp phòng thủ và quy trình ứng cứu.'],
    vault: ['6-8 giờ', 'IAM, database, Kubernetes', 'Cấp secret theo policy, lease, rotation, revoke và audit.'],
    mesh: ['7-9 giờ', 'Kubernetes và observability', 'Vận hành mTLS, traffic split, retry/timeout và policy trong service mesh.'],
    production: ['3-4 giờ', 'Hoàn thành đường học chính', 'Review production readiness và tìm đủ bằng chứng cho từng kiểm soát.'],
    finalquiz: ['45 phút', 'Hoàn thành đường học chính', 'Xác định phần kiến thức còn yếu trước khi làm dự án thật.'],
    commands: ['Tra cứu', 'Linux căn bản', 'Tìm đúng lệnh theo mục tiêu, hiểu output và rủi ro trước khi chạy.'],
    errors: ['Tra cứu', 'Linux, web, container', 'Khoanh vùng nhanh lỗi phổ biến bằng triệu chứng và bằng chứng.'],
    runbook: ['Tra cứu', 'Các module vận hành', 'Thực hiện incident theo thứ tự ổn định, có verify và rollback.'],
    cheatsheet: ['Tra cứu', 'Các module vận hành', 'Ôn lệnh cốt lõi theo tình huống thay vì học thuộc rời rạc.']
  };

  const pathCatalog = {
    linux: {
      duration: '12-16 giờ', prerequisite: 'Không',
      outcome: 'Tự vận hành một Linux server: user, quyền, service, log, network và storage.',
      chapters: [
        ['Shell và filesystem', 'Hiểu cây thư mục, đường dẫn, stdin/stdout và cách tìm dữ liệu.', ['Phân biệt đường dẫn tuyệt đối, tương đối và biến PATH.', 'Đọc log bằng less, tail; tìm bằng find, rg hoặc grep.', 'Copy, đồng bộ và nén dữ liệu mà không làm mất metadata.']],
        ['User, group và permission', 'Quyền phải được đọc theo user thật đang chạy process.', ['Đọc owner/group/other và bit r, w, x trên file lẫn thư mục.', 'Dùng id, ps và namei -l để lần quyền qua toàn bộ đường dẫn.', 'Chỉ cấp quyền tối thiểu; không dùng chmod 777 để né lỗi.']],
        ['Process, systemd và log', 'Theo vòng đời process từ unit file tới journal.', ['Đọc ExecStart, WorkingDirectory và EnvironmentFile của service.', 'Phân biệt start, restart, reload, enable và trạng thái failed.', 'Dùng journalctl theo unit, thời gian và boot để dựng timeline lỗi.']],
        ['Network và storage', 'Kiểm tra port, route, DNS, dung lượng và inode theo thứ tự.', ['Dùng ss, curl, dig và ip route để định vị lớp kết nối hỏng.', 'Phân biệt disk full, inode full và file đã xóa còn bị process giữ.', 'Kiểm tra mount/fstab trước khi kết luận ứng dụng làm mất dữ liệu.']]
      ],
      lab: ['Dựng web service Linux có lỗi giả lập', 'Tạo user deploy, webroot và systemd service; sau đó cố tình làm sai quyền và làm đầy thư mục log.', ['Tạo user/group riêng, thư mục release và file env quyền 600.', 'Dựng Nginx hoặc service HTTP nhỏ chạy bằng user không phải root.', 'Làm sai owner một thư mục cha, dùng namei -l tìm và sửa.', 'Tạo log test, kiểm tra df/du/inode rồi dọn đúng mục tiêu.'], ['systemctl status không báo failed', 'curl localhost trả mã 200', 'namei -l cho thấy service user đọc được webroot', 'df -h và df -ih còn ngưỡng an toàn']],
      checks: [['Vì sao file chmod 644 vẫn có thể làm Nginx trả 403?', 'Vì user Nginx còn cần quyền x trên mọi thư mục cha; cũng phải kiểm tra owner, ACL và cơ chế SELinux/AppArmor. Dùng namei -l trên đường dẫn đầy đủ.'], ['Vì sao df báo đầy nhưng du không cộng đủ dung lượng?', 'Một process có thể còn giữ file đã xóa. Dùng lsof +L1 để tìm descriptor rồi xử lý đúng process.'], ['Reload khác restart thế nào?', 'Reload yêu cầu process đọc lại cấu hình mà không dừng toàn bộ phiên hiện tại nếu service hỗ trợ; restart tạo vòng đời process mới và có thể gây gián đoạn.']],
      incident: ['Ứng dụng 500 lúc nửa đêm', 'SSH vẫn vào được, Nginx còn chạy nhưng app không ghi được log và ổ /var báo 100%.', ['Xác nhận impact và thời điểm lỗi từ access/error log.', 'So sánh df -h, df -ih, du và lsof +L1.', 'Giải phóng đúng dữ liệu hoặc restart đúng process giữ file.', 'Verify HTTP, theo dõi disk và bổ sung alert/runbook.']]
    },
    bug: {
      duration: '8-10 giờ', prerequisite: 'Linux căn bản',
      outcome: 'Debug theo triệu chứng, bằng chứng và giả thuyết; sửa nhỏ, verify và viết RCA.',
      chapters: [
        ['Tái hiện và khoanh phạm vi', 'Biến câu “web lỗi” thành triệu chứng đo được.', ['Ghi URL, user, thời điểm, status code và tần suất.', 'So sánh máy/user bị lỗi với trường hợp hoạt động.', 'Xác định thay đổi gần nhất và blast radius.']],
        ['Thu thập bằng chứng', 'Giữ trạng thái trước khi restart hoặc sửa cấu hình.', ['Lấy log cùng timestamp từ proxy, app, database và hệ điều hành.', 'Ghi process, socket, tài nguyên và request mẫu.', 'Tách dữ kiện quan sát được khỏi giả thuyết.']],
        ['Giả thuyết và thay đổi nhỏ', 'Mỗi thao tác phải trả lời một câu hỏi.', ['Xếp giả thuyết theo xác suất và chi phí kiểm tra.', 'Chỉ đổi một biến, chuẩn bị rollback trước khi áp dụng.', 'Verify từ góc nhìn người dùng và metric hệ thống.']],
        ['RCA và phòng tái diễn', 'RCA tìm điều kiện hệ thống cho phép lỗi xảy ra.', ['Viết timeline, impact, root cause và contributing factors.', 'Giao owner và hạn cho action item cụ thể.', 'Bổ sung test, alert hoặc guardrail có thể kiểm chứng.']]
      ],
      lab: ['Điều tra một lỗi 502', 'Làm app upstream dừng hoặc đổi sai port, sau đó tìm nguyên nhân mà không chỉnh ngẫu nhiên.', ['Gửi request để ghi lại status, header và thời gian lỗi.', 'Đọc Nginx error log, service log và socket đang listen.', 'Lập hai giả thuyết rồi chạy lệnh để loại từng giả thuyết.', 'Khôi phục upstream, verify và viết RCA 5 dòng.'], ['curl qua Nginx trả 200', 'upstream healthcheck hoạt động', 'RCA có timeline và nguyên nhân gốc', 'Có một biện pháp phòng tái diễn']],
      checks: [['Khi nào nên restart service?', 'Sau khi đã lưu bằng chứng cần thiết và có lý do cho rằng restart giúp khôi phục. Restart không thay thế việc tìm nguyên nhân.'], ['Một giả thuyết tốt có đặc điểm gì?', 'Cụ thể, có thể kiểm tra bằng một quan sát hoặc lệnh và có kết quả giúp loại trừ nguyên nhân.'], ['RCA có phải tìm người gây lỗi không?', 'Không. RCA tập trung vào điều kiện kỹ thuật và quy trình khiến lỗi lọt qua, rồi tạo biện pháp ngăn tái diễn.']],
      incident: ['API chậm sau deploy', 'p95 tăng từ 180 ms lên 2.4 s nhưng CPU app bình thường.', ['So sánh phiên bản và thời điểm metric đổi.', 'Tách thời gian proxy, app và database.', 'Kiểm tra slow query hoặc dependency mới.', 'Rollback nếu vượt SLO, sau đó tái hiện ở staging.']]
    },
    ccna: {
      duration: '14-18 giờ', prerequisite: 'Linux network cơ bản',
      outcome: 'Đọc subnet, switching, routing và xác định đúng lớp gây mất kết nối.',
      chapters: [
        ['Ethernet, VLAN và STP', 'Hiểu frame đi trong broadcast domain và switch học MAC.', ['Phân biệt access port, trunk và native VLAN.', 'Đọc MAC table để biết frame được forward ở đâu.', 'Hiểu STP chặn loop và hậu quả khi VLAN không được allow.']],
        ['IPv4, IPv6 và subnetting', 'Địa chỉ và prefix quyết định host nào cùng mạng.', ['Tính network, broadcast và dải host không cần đoán.', 'Phân biệt default gateway với DNS server.', 'Đọc ARP/ND để nối địa chỉ IP với lớp liên kết.']],
        ['Routing và network services', 'Router chọn longest prefix match rồi áp chính sách.', ['Đọc connected, static và dynamic route.', 'Hiểu OSPF neighbor, cost và default route.', 'Nắm DHCP, DNS, NAT/PAT và NTP trong luồng thực tế.']],
        ['ACL và troubleshooting phân lớp', 'Kiểm tra từ physical tới policy thay vì reset thiết bị.', ['Xác nhận link, VLAN, IP/mask, gateway và route.', 'Đọc ACL theo thứ tự cùng implicit deny.', 'Dùng ping/traceroute có mục tiêu để kiểm tra giả thuyết.']]
      ],
      lab: ['Mạng văn phòng ba VLAN', 'Dựng VLAN Users, Servers, Guest; cho Users tới Servers và chặn Guest.', ['Chia subnet và gán IP/gateway cho ba VLAN.', 'Cấu hình access/trunk và router-on-a-stick.', 'Bật DHCP, NAT overload và route mặc định.', 'Viết ACL chặn Guest tới Servers nhưng vẫn cho ra Internet.'], ['Mỗi host nhận đúng subnet DHCP', 'Users truy cập được server', 'Guest không truy cập server', 'show vlan/trunk/route/acl khớp thiết kế']],
      checks: [['Vì sao hai máy cùng switch vẫn không ping nếu khác VLAN?', 'VLAN tạo broadcast domain khác nhau; muốn liên lạc cần routing L3 và policy cho phép.'], ['Longest prefix match là gì?', 'Router chọn route có prefix cụ thể nhất trong các route khớp địa chỉ đích.'], ['ACL có dòng permit nhưng traffic vẫn bị chặn vì sao?', 'Có thể traffic khớp một deny phía trên, ACL gắn sai chiều/interface hoặc rơi vào implicit deny cuối danh sách.']],
      incident: ['VLAN 20 không ra Internet', 'Host có IP DHCP nhưng ping gateway thất bại.', ['Kiểm tra IP/mask/gateway trên host.', 'Kiểm tra access VLAN và trunk allowed VLAN.', 'Kiểm tra subinterface/SVI có up và đúng tag.', 'Sau khi ping gateway được mới kiểm tra route, NAT và ACL.']]
    },
    nginxweb: {
      duration: '8-10 giờ', prerequisite: 'Linux và network',
      outcome: 'Dựng reverse proxy HTTPS, đọc đúng 403/404/502 và thay đổi cấu hình an toàn.',
      chapters: [
        ['Request và server block', 'Hiểu cách Nginx chọn listen, server_name và location.', ['Theo request từ DNS tới IP, TLS, server block và location.', 'Phân biệt root với alias và thứ tự location.', 'Đọc access log để biết request thực sự đi đâu.']],
        ['Reverse proxy và upstream', 'Proxy phải truyền đúng protocol, header và timeout.', ['Kiểm tra upstream trực tiếp trước khi kết luận Nginx lỗi.', 'Hiểu Host, X-Forwarded-For, X-Forwarded-Proto.', 'Phân biệt connect timeout, read timeout và upstream reset.']],
        ['TLS và hardening', 'Chứng chỉ, chain và security header phải được kiểm tra từ bên ngoài.', ['Đọc ngày hết hạn và chain bằng openssl/curl.', 'Bật redirect HTTPS, header phù hợp và giới hạn upload.', 'Dùng rate limit có key và ngưỡng phù hợp luồng login/API.']],
        ['Deploy và troubleshoot', 'Mọi thay đổi đi qua test, reload và verify.', ['Chạy nginx -t trước reload.', 'Phân biệt mã lỗi do Nginx hay do upstream.', 'Giữ bản config trước thay đổi và có lệnh rollback.']]
      ],
      lab: ['Reverse proxy HTTPS có healthcheck', 'Proxy domain test tới app port 3000, thêm log format và tạo lỗi upstream.', ['Dựng server block HTTP và proxy tới app local.', 'Cấu hình TLS, redirect và header proxy chuẩn.', 'Dừng app để quan sát 502 cùng error log.', 'Khôi phục app, test config, reload và verify.'], ['nginx -t thành công', 'curl -I HTTPS trả đúng header', 'upstream trực tiếp và qua proxy đều 200', 'log ghi upstream_status và request_time']],
      checks: [['502 thường nói điều gì?', 'Nginx đã nhận request nhưng không nhận phản hồi hợp lệ từ upstream; kiểm tra app, socket/port, permission và timeout.'], ['root khác alias thế nào?', 'root ghép URI vào đường dẫn gốc, còn alias thay phần location bằng đường dẫn chỉ định; dấu gạch cuối rất quan trọng.'], ['Vì sao phải nginx -t trước reload?', 'Để bắt lỗi cú pháp/tham chiếu file trước khi process đang chạy nhận cấu hình mới.']],
      incident: ['Deploy xong trả 403', 'File index tồn tại và config trỏ đúng webroot.', ['Xem error log để phân biệt permission với deny/index.', 'Dùng ps tìm user worker và namei -l đường dẫn.', 'Sửa owner/quyền tối thiểu trên đúng thư mục.', 'Verify rồi bổ sung kiểm tra permission vào deploy.']]
    },
    database: {
      duration: '12-16 giờ', prerequisite: 'Linux và ứng dụng web',
      outcome: 'Vận hành PostgreSQL/MySQL/Redis có quyền, index, backup, restore và quan sát.',
      chapters: [
        ['Mô hình dữ liệu và transaction', 'Thiết kế schema dựa trên tính đúng đắn trước hiệu năng.', ['Chọn key, constraint và kiểu dữ liệu rõ ràng.', 'Hiểu ACID, isolation và deadlock ở mức vận hành.', 'Dùng migration có version và tương thích rollback.']],
        ['Query và index', 'Đo query plan thay vì thêm index theo cảm giác.', ['Đọc EXPLAIN/EXPLAIN ANALYZE và số row thực tế.', 'Hiểu composite index, selectivity và write overhead.', 'Theo slow query, lock và connection pool.']],
        ['Quyền và kết nối', 'App chỉ có quyền đúng database/schema cần dùng.', ['Tách admin, migration, app read/write và backup role.', 'Giới hạn listen address, pg_hba/firewall và TLS.', 'Theo connection saturation và timeout giữa app với DB.']],
        ['Backup và restore', 'Backup chỉ đáng tin sau một lần restore kiểm chứng.', ['Chọn logical dump, physical backup và PITR theo RPO/RTO.', 'Mã hóa, checksum và giữ bản offsite.', 'Restore sang môi trường tách biệt rồi kiểm tra dữ liệu.']]
      ],
      lab: ['Database cho ứng dụng có restore drill', 'Tạo schema/user, nạp dữ liệu, tối ưu một query và phục hồi từ backup.', ['Tạo role app quyền tối thiểu và schema có constraint.', 'Nạp dữ liệu, chạy EXPLAIN trước/sau khi thêm index.', 'Tạo backup kèm checksum.', 'Xóa database lab, restore sang tên mới và đối chiếu số bản ghi.'], ['App role không có quyền admin', 'Query plan dùng index khi phù hợp', 'Checksum backup hợp lệ', 'Restore hoàn chỉnh và ứng dụng đọc được']],
      checks: [['Vì sao index không phải lúc nào cũng tốt?', 'Index tốn storage, RAM cache và chi phí cập nhật ở mỗi INSERT/UPDATE/DELETE; index kém selectivity có thể không được dùng.'], ['Backup file tồn tại đã đủ chưa?', 'Chưa. Phải kiểm tra checksum và restore test để chứng minh dữ liệu lẫn quy trình phục hồi hoạt động.'], ['Connection pool quá lớn gây gì?', 'Tổng connection có thể vượt khả năng database, tăng context switching, memory và làm timeout lan rộng.']],
      incident: ['API timeout dù CPU app thấp', 'Database đạt max_connections và nhiều query chờ lock.', ['Đo active/idle connection và lock wait.', 'Tìm transaction giữ lock lâu.', 'Khôi phục bằng kết thúc đúng session hoặc giảm traffic.', 'Sửa transaction, pool limit và thêm alert.']]
    },
    docker: {
      duration: '10-14 giờ', prerequisite: 'Linux, network và database',
      outcome: 'Đóng gói ứng dụng bằng image nhỏ, Compose có volume/network/healthcheck và release rõ ràng.',
      chapters: [
        ['Image và build', 'Dockerfile tạo artifact bất biến, không phải một máy ảo thu nhỏ.', ['Sắp layer để cache hiệu quả và dùng multi-stage build.', 'Pin base image/tag, không đưa secret vào layer.', 'Chạy process bằng user không phải root khi có thể.']],
        ['Container runtime', 'Container là process có filesystem và namespace riêng.', ['Đọc command, env, exit code và signal.', 'Phân biệt restart policy với healthcheck.', 'Đặt resource limit và quan sát OOMKilled.']],
        ['Network và volume', 'State phải tách khỏi vòng đời container.', ['Dùng service name trong network Compose, không hardcode IP.', 'Phân biệt bind mount, named volume và tmpfs.', 'Kiểm tra owner UID/GID khi volume báo permission denied.']],
        ['Compose và release', 'Một release phải có version, dependency order, verify và rollback.', ['Dùng depends_on có health condition khi phù hợp.', 'Ghi image tag bất biến và env theo môi trường.', 'Backup volume/data trước migration nguy hiểm.']]
      ],
      lab: ['Ứng dụng Compose ba service', 'Đóng gói app, database và reverse proxy; tạo lỗi healthcheck và volume permission.', ['Viết Dockerfile multi-stage và .dockerignore.', 'Dựng Compose app + DB + Nginx với network riêng.', 'Thêm healthcheck, limit và named volume.', 'Tạo lỗi env/quyền, đọc logs/inspect rồi rollback image.'], ['docker compose ps đều healthy', 'App kết nối DB bằng service name', 'Dữ liệu còn sau khi recreate container', 'Rollback về tag cũ hoạt động']],
      checks: [['Volume khác image layer ở điểm nào?', 'Volume tồn tại độc lập với container và phù hợp dữ liệu thay đổi; image layer là artifact read-only của release.'], ['Container restart liên tục xem gì trước?', 'Xem docker ps -a, logs, inspect State/ExitCode/OOMKilled rồi kiểm tra command, env, volume và healthcheck.'], ['Vì sao không nên dùng latest ở production?', 'latest không xác định chính xác artifact, làm rollback và audit khó; nên dùng version hoặc digest bất biến.']],
      incident: ['Release mới mất kết nối database', 'App container chạy nhưng log báo ECONNREFUSED tới localhost.', ['Nhận ra localhost trong container là chính container đó.', 'Kiểm tra service name, network và port nội bộ.', 'Sửa DATABASE_HOST sang tên service DB.', 'Thêm integration healthcheck vào pipeline.']]
    },
    automation: {
      duration: '8-10 giờ', prerequisite: 'Linux và Git',
      outcome: 'Viết Bash/Python/Ansible idempotent, có validation, log và mã thoát đúng.',
      chapters: [
        ['Script an toàn', 'Input phải được kiểm tra trước khi chạm hệ thống.', ['Bật strict mode phù hợp và quote biến trong Bash.', 'Validate path, user, option và dependency.', 'Dùng exit code cùng stderr để báo lỗi rõ.']],
        ['Idempotency', 'Chạy lại không tạo trạng thái sai hoặc dữ liệu trùng.', ['Kiểm tra trạng thái trước khi thay đổi.', 'Dùng module Ansible thay shell khi có thể.', 'Tách check mode, apply và verify.']],
        ['Secret, log và lịch chạy', 'Automation phải quan sát được nhưng không lộ bí mật.', ['Đọc secret từ nguồn được phân quyền, không in ra log.', 'Ghi timestamp, target, kết quả và correlation id.', 'Dùng systemd timer/cron có lock để tránh chạy chồng.']],
        ['Test và rollback', 'Script hạ tầng cũng cần test và đường quay lại.', ['Test function parse/validate bằng input tốt và xấu.', 'Chạy ở staging hoặc dry-run trước production.', 'Backup file cấu hình và restore khi verify thất bại.']]
      ],
      lab: ['Tự động hóa triển khai Nginx', 'Viết script hoặc playbook tạo user, cấu hình site, test và reload có rollback.', ['Thu thập biến domain, port và release path rồi validate.', 'Tạo file từ template và giữ bản config cũ.', 'Chạy nginx -t trước reload.', 'Nếu healthcheck fail, khôi phục config và trả exit code khác 0.'], ['Chạy lần hai không tạo thay đổi thừa', 'Secret không xuất hiện trong log', 'Lỗi config kích hoạt rollback', 'Log nêu rõ target và kết quả']],
      checks: [['Idempotent nghĩa là gì?', 'Cùng một automation chạy nhiều lần trên cùng trạng thái vẫn cho kết quả mong muốn mà không tích lũy thay đổi sai.'], ['Tại sao phải quote biến Bash?', 'Để tránh word splitting và glob expansion làm sai path/argument, đặc biệt khi biến rỗng hoặc chứa khoảng trắng.'], ['Cron job chạy chồng xử lý sao?', 'Dùng flock hoặc lock tương đương, timeout và log thời gian chạy; cân nhắc systemd timer để quản tốt hơn.']],
      incident: ['Script dọn backup xóa nhầm', 'Biến thư mục rỗng làm lệnh dọn chạy ở path rộng hơn dự kiến.', ['Dừng job và giữ log/script phiên bản đã chạy.', 'Xác định chính xác dữ liệu bị ảnh hưởng.', 'Restore từ bản offsite nếu cần.', 'Thêm validation path, dry-run và retention test.']]
    },
    cicd: {
      duration: '10-14 giờ', prerequisite: 'Git, automation và Docker',
      outcome: 'Thiết kế pipeline test, scan, build một lần, deploy có verify và rollback.',
      chapters: [
        ['Continuous Integration', 'Mỗi commit phải tạo phản hồi nhanh và lặp lại được.', ['Chạy lint, unit test, integration test theo tầng.', 'Cache dependency nhưng không che lỗi reproducibility.', 'Dừng pipeline sớm khi quality gate thất bại.']],
        ['Artifact và supply chain', 'Build một artifact bất biến rồi quảng bá qua môi trường.', ['Gắn version/commit SHA và lưu checksum hoặc provenance.', 'Quét secret, dependency, image và IaC.', 'Tách quyền build, registry và deploy.']],
        ['Deploy strategy', 'Chọn rolling, blue-green hoặc canary theo rủi ro.', ['Chạy migration tương thích ngược trước code mới.', 'Dùng health/readiness và smoke test sau deploy.', 'Tự động dừng hoặc rollback khi metric vượt ngưỡng.']],
        ['Production controls', 'Pipeline là change record và guardrail.', ['Bảo vệ branch/environment và dùng approval đúng chỗ.', 'Secret ngắn hạn, mask log và rotation.', 'Lưu release note, người duyệt, artifact và kết quả verify.']]
      ],
      lab: ['Pipeline từ commit tới rollback', 'Tạo pipeline cho app container và cố tình cho smoke test thất bại.', ['Lint/test rồi build image gắn commit SHA.', 'Quét secret/dependency/image trước khi push.', 'Deploy staging, chạy smoke test và promote.', 'Tạo release lỗi để kiểm tra rollback tự động.'], ['Artifact ở các stage có cùng digest', 'Pipeline dừng khi scan/test fail', 'Deploy có healthcheck thực', 'Rollback đưa metric và request về bình thường']],
      checks: [['Build once, deploy many có lợi gì?', 'Giữ đúng một artifact đã test qua mọi môi trường, tránh rebuild tạo khác biệt không kiểm soát.'], ['Rollback code có đủ khi migration DB phá vỡ schema cũ?', 'Không. Migration cần chiến lược tương thích ngược, expand/contract hoặc kế hoạch khôi phục dữ liệu.'], ['Secret pipeline nên quản thế nào?', 'Dùng secret store/OIDC ngắn hạn, scope tối thiểu, mask log và rotate khi nghi lộ.']],
      incident: ['Deploy xanh nhưng người dùng lỗi', 'Healthcheck chỉ kiểm port, trong khi API quan trọng trả 500.', ['Dừng rollout và xác nhận endpoint ảnh hưởng.', 'Rollback artifact ổn định.', 'Đọc app/DB log để tìm nguyên nhân.', 'Nâng healthcheck/smoke test kiểm hành vi quan trọng.']]
    },
    cloud: {
      duration: '8-12 giờ', prerequisite: 'Network, Linux và security',
      outcome: 'Thiết kế tài khoản, network, compute, storage cloud có quyền và chi phí kiểm soát.',
      chapters: [
        ['Identity và account', 'Cloud bắt đầu bằng ranh giới tài khoản và quyền.', ['Tách production khỏi sandbox bằng account/project/subscription.', 'Dùng role, MFA và federation thay access key dài hạn.', 'Bật audit log trước khi triển khai workload.']],
        ['Network và exposure', 'Public IP, route và security rule quyết định bề mặt tấn công.', ['Thiết kế VPC/VNet, subnet public/private và egress.', 'Giới hạn security group theo nguồn và port thật cần.', 'Dùng VPN/Tailscale/bastion cho quản trị.']],
        ['Compute, data và resilience', 'Chọn dịch vụ theo state, SLA và khả năng phục hồi.', ['Tách stateless compute khỏi database/object storage.', 'Hiểu multi-AZ khác multi-region.', 'Mã hóa, versioning và backup theo RPO/RTO.']],
        ['Cost và operations', 'Mọi tài nguyên cần owner, tag, metric và vòng đời.', ['Theo cost anomaly và tài nguyên nhàn rỗi.', 'Đặt quota/budget và retention cho log/snapshot.', 'Dùng IaC để review và phát hiện drift.']]
      ],
      lab: ['VPC tối thiểu cho ứng dụng web', 'Thiết kế hai lớp public/private và chỉ phơi LB ra Internet.', ['Tạo sơ đồ subnet, route, NAT/egress và flow request.', 'Đặt app/database ở private subnet.', 'Viết security rule nguồn-đích tối thiểu.', 'Bật audit, metric, budget và backup policy.'], ['Không có DB public IP', 'SSH/admin không mở toàn Internet', 'Audit log hoạt động', 'Sơ đồ có failure domain và hướng phục hồi']],
      checks: [['Security group 0.0.0.0/0 nguy hiểm khi nào?', 'Khi mở port không cần public, đặc biệt SSH, database, dashboard/admin; phải đánh giá cả IPv6 ::/0.'], ['Multi-AZ giải quyết gì?', 'Giảm phụ thuộc một availability zone, nhưng không tự động giải quyết lỗi logic, xóa dữ liệu hoặc sự cố toàn region.'], ['Vì sao nên dùng role/OIDC thay access key dài hạn?', 'Credential ngắn hạn, scope và audit tốt hơn, giảm rủi ro key bị lộ lâu dài.']],
      incident: ['Hóa đơn tăng đột biến', 'Data egress và snapshot cũ tăng sau một thay đổi kiến trúc.', ['Khoanh cost theo service, region, tag và thời gian.', 'Xác định luồng traffic hoặc retention mới.', 'Chặn phát sinh không cần thiết mà không phá workload.', 'Thêm budget alert và policy vòng đời.']]
    },
    terraform: {
      duration: '8-12 giờ', prerequisite: 'Cloud và Git',
      outcome: 'Quản hạ tầng bằng module, remote state, plan review, policy và drift control.',
      chapters: [
        ['Resource graph và lifecycle', 'Terraform tính dependency rồi đưa hạ tầng về desired state.', ['Hiểu resource, data source, variable, output và provider.', 'Đọc create/update/replace/destroy trong plan.', 'Dùng lifecycle có chủ đích, không che drift vô thời hạn.']],
        ['State an toàn', 'State ánh xạ code với tài nguyên thật và có thể chứa secret.', ['Dùng remote backend có lock, encryption và versioning.', 'Không sửa state tay khi chưa hiểu hậu quả.', 'Dùng import/moved block khi tiếp nhận hoặc refactor.']],
        ['Module và môi trường', 'Module tạo chuẩn lặp lại, không phải gom mọi thứ vào một file.', ['Thiết kế input/output rõ và pin provider/module version.', 'Tách account/environment bằng state riêng.', 'Không dùng workspace như ranh giới bảo mật duy nhất.']],
        ['Pipeline và policy', 'Plan phải được lưu, review và apply đúng artifact đó.', ['Fmt/validate/lint/scan trước plan.', 'Giới hạn quyền CI và yêu cầu approval production.', 'Chạy plan định kỳ để phát hiện drift.']]
      ],
      lab: ['Provision network và VM bằng remote state', 'Tạo module network/compute, cố tình sửa tay một rule rồi phát hiện drift.', ['Cấu hình backend có lock và versioning.', 'Viết module với variable validation và output.', 'Chạy fmt, validate, scan và lưu plan.', 'Sửa security rule ngoài Terraform, chạy plan và đưa về Git.'], ['Không có secret commit vào repo/state output', 'Plan được review trước apply', 'State lock hoạt động', 'Drift được phát hiện và xử lý có chủ đích']],
      checks: [['Vì sao state nhạy cảm?', 'State chứa ID, topology và đôi khi cả secret/giá trị resource; mất hoặc lộ state ảnh hưởng trực tiếp hạ tầng.'], ['Plan khác apply ra sao?', 'Plan mô tả thay đổi dự kiến theo state/config hiện tại; apply thực thi plan và cập nhật state.'], ['Import có tạo code không?', 'Import chủ yếu đưa resource vào state; bạn vẫn phải viết cấu hình tương ứng và kiểm tra plan.']],
      incident: ['Plan muốn recreate database', 'Một thuộc tính immutable hoặc địa chỉ resource thay đổi sau refactor.', ['Không apply khi chưa hiểu dấu -/+.', 'So sánh state address và provider diff.', 'Dùng moved block/import hoặc sửa config nếu phù hợp.', 'Backup database và có change approval trước thao tác phá hủy.']]
    },
    kubernetes: {
      duration: '14-20 giờ', prerequisite: 'Docker, network và YAML',
      outcome: 'Deploy và debug workload qua Pod, Deployment, Service, Ingress, probe, storage và RBAC.',
      chapters: [
        ['Desired state và Pod', 'Controller liên tục kéo trạng thái thực về khai báo.', ['Đọc Pod phase, condition, event và container state.', 'Hiểu request/limit, scheduling và OOMKilled.', 'Dùng ConfigMap/Secret đúng vai trò, không bake config vào image.']],
        ['Service và Ingress', 'Service chọn endpoint bằng label; Ingress định tuyến từ ngoài vào.', ['Kiểm tra selector và EndpointSlice khi service không có endpoint.', 'Phân biệt ClusterIP, NodePort và LoadBalancer.', 'Theo request qua DNS, ingress controller, service tới pod.']],
        ['Probe, rollout và autoscaling', 'Probe sai có thể tự tạo outage.', ['Readiness quyết định nhận traffic; liveness quyết định restart.', 'Đọc rollout status/history và dùng undo.', 'HPA cần metric và request tài nguyên hợp lý.']],
        ['Storage, RBAC và operations', 'State và quyền cần ranh giới rõ.', ['Đọc PVC, StorageClass và node affinity khi Pod Pending.', 'Cấp ServiceAccount/Role tối thiểu.', 'Dùng namespace, NetworkPolicy, quota và backup manifest/data.']]
      ],
      lab: ['Ứng dụng Kubernetes có lỗi giả lập', 'Deploy app hai replica, service, ingress, config, secret, probe và HPA.', ['Tạo Deployment có request/limit và readiness/liveness.', 'Tạo Service/Ingress rồi kiểm tra endpoint.', 'Cố tình sai ConfigMap để tạo CrashLoopBackOff.', 'Dùng describe, events, logs --previous để sửa và rollout.'], ['Hai replica Ready và nhận traffic', 'Service có EndpointSlice đúng', 'Rollout history và undo hoạt động', 'RBAC không cấp cluster-admin cho app']],
      checks: [['Service có ClusterIP nhưng curl timeout vì sao?', 'Có thể selector không khớp nên không có endpoint, pod chưa Ready, targetPort sai hoặc NetworkPolicy chặn.'], ['Readiness khác liveness?', 'Readiness loại pod khỏi traffic; liveness yêu cầu kubelet restart container khi bị kẹt.'], ['CrashLoopBackOff xem gì?', 'Dùng describe pod, events và logs --previous; kiểm command, env/secret, volume, probe và exit code.']],
      incident: ['Rollout mới gây 30% lỗi', 'Một phần pod mới Ready quá sớm trước khi dependency sẵn sàng.', ['Dừng/rollback rollout để khôi phục.', 'So sánh pod revision và lỗi theo pod.', 'Sửa readiness kiểm dependency quan trọng.', 'Canary lại với metric gate và thời gian quan sát.']]
    },
    monitoring: {
      duration: '10-14 giờ', prerequisite: 'Linux, web và container',
      outcome: 'Thiết kế metrics, logs, alert và dashboard trả lời được tình trạng người dùng.',
      chapters: [
        ['SLI, SLO và golden signals', 'Bắt đầu từ trải nghiệm người dùng, không từ biểu đồ có sẵn.', ['Đo availability, latency, traffic, errors và saturation.', 'Dùng percentile p95/p99 thay chỉ average.', 'Đặt SLO và error budget phù hợp dịch vụ.']],
        ['Metrics và dashboard', 'Metric cần tên, label và cardinality có kiểm soát.', ['Chọn counter, gauge, histogram đúng loại.', 'Dashboard đi từ tổng quan tới dependency và resource.', 'Tránh label có user ID/URL tự do gây cardinality nổ.']],
        ['Logs và correlation', 'Log có cấu trúc giúp dựng lại request và incident.', ['Ghi timestamp, level, service, request_id/trace_id.', 'Không ghi secret, token hoặc PII không cần thiết.', 'Đặt retention và truy vấn theo timeline.']],
        ['Alert và runbook', 'Alert phải actionable và có owner.', ['Alert theo triệu chứng người dùng trước nguyên nhân thấp tầng.', 'Dùng for duration, grouping và inhibition để giảm nhiễu.', 'Mỗi alert có impact, dashboard, lệnh kiểm tra và bước rollback.']]
      ],
      lab: ['Quan sát một API và diễn tập outage', 'Thu metric HTTP, log có request_id và alert khi error rate vượt ngưỡng.', ['Tạo dashboard rate, error, duration và saturation.', 'Tạo alert error rate/latency có thời gian giữ.', 'Gây lỗi upstream để xem metric và log cùng timestamp.', 'Thực hiện runbook, khôi phục và đo thời gian phát hiện/phục hồi.'], ['Dashboard thể hiện p95 và error rate', 'Alert có owner/runbook', 'Log nối được request qua service', 'Không có token/secret trong log']],
      checks: [['Average latency thấp có chứng minh mọi user nhanh không?', 'Không. Một nhóm request chậm có thể bị che; cần percentile p95/p99 và phân tách endpoint/region phù hợp.'], ['Alert CPU cao có luôn tốt không?', 'Không. CPU cao chỉ hữu ích nếu liên quan impact hoặc saturation; ưu tiên alert theo lỗi/latency người dùng rồi dùng CPU để chẩn đoán.'], ['Cardinality cao gây gì?', 'Tạo quá nhiều time series, tăng RAM/storage/query cost và có thể làm hệ thống monitoring mất ổn định.']],
      incident: ['Alert storm sau database chậm', 'Hàng chục service cùng báo timeout và CPU nhưng chỉ một dependency gốc.', ['Nhóm alert theo service/dependency và tìm tín hiệu bắt đầu sớm nhất.', 'Xác nhận database latency/connection/lock.', 'Giảm tải hoặc rollback thay đổi gây lỗi.', 'Thêm dependency mapping và inhibition để giảm alert trùng.']]
    },
    backupdr: {
      duration: '8-10 giờ', prerequisite: 'Linux, database và cloud',
      outcome: 'Thiết kế backup theo RPO/RTO, có offsite/immutable và restore drill đo được.',
      chapters: [
        ['RPO, RTO và phạm vi', 'Bắt đầu từ dữ liệu nào được phép mất và downtime chấp nhận được.', ['Liệt kê database, object, config, secret metadata và manifest.', 'Chọn tần suất theo RPO, quy trình restore theo RTO.', 'Xác định dependency và thứ tự phục hồi.']],
        ['Chiến lược backup', '3-2-1 là điểm bắt đầu, không phải bảo đảm tuyệt đối.', ['Giữ nhiều bản, nhiều loại media và một bản offsite.', 'Tách credential backup khỏi app/admin thông thường.', 'Dùng encryption, checksum, retention và immutable khi phù hợp.']],
        ['Restore và kiểm chứng', 'Restore drill phải có tiêu chí dữ liệu và ứng dụng.', ['Khôi phục vào môi trường tách biệt.', 'Đối chiếu record count, checksum và chức năng quan trọng.', 'Ghi thời gian từng bước để biết RTO thực.']],
        ['Disaster recovery', 'DR gồm người, quyền, DNS, hạ tầng và thông tin liên lạc.', ['Viết runbook từ khai báo sự cố tới failover/failback.', 'Chuẩn bị credential break-glass và contact owner.', 'Diễn tập game day rồi sửa điểm nghẽn.']]
      ],
      lab: ['Restore drill ứng dụng có database', 'Backup DB, upload và config; sau đó phục hồi vào host/namespace mới.', ['Ghi RPO/RTO mục tiêu và timestamp bắt đầu.', 'Tạo backup, checksum, mã hóa và copy sang nơi tách biệt.', 'Giả lập mất dữ liệu lab rồi restore theo runbook.', 'Kiểm tra app, số bản ghi, file upload và đo thời gian.'], ['Backup checksum đúng', 'Bản offsite dùng credential tách biệt', 'Ứng dụng hoạt động sau restore', 'RTO thực được ghi và so với mục tiêu']],
      checks: [['Snapshot có thay thế backup không?', 'Không hoàn toàn. Snapshot có thể cùng failure domain/quyền với production và không chứng minh restore logic; cần bản tách biệt và kiểm thử.'], ['RPO và RTO khác nhau?', 'RPO là lượng dữ liệu tối đa chấp nhận mất theo thời gian; RTO là thời gian tối đa để khôi phục dịch vụ.'], ['Vì sao app không nên xóa được backup?', 'Nếu app bị chiếm quyền, kẻ tấn công hoặc lỗi logic không thể xóa luôn đường phục hồi.']],
      incident: ['Backup hàng ngày nhưng restore thất bại', 'File dump có mặt nhưng thiếu extension/version và config mã hóa.', ['Giữ bằng chứng và thử các bản cũ hơn.', 'Xác định thành phần/phần mềm còn thiếu.', 'Khôi phục phương án khả dụng nhất và thông báo impact.', 'Bổ sung restore test tự động cùng inventory dependency.']]
    },
    security: {
      duration: '12-16 giờ', prerequisite: 'Hoàn thành phase 1-6',
      outcome: 'Áp dụng defense-in-depth cho server, app, pipeline, secret, logging và incident.',
      chapters: [
        ['Asset, threat và baseline', 'Bảo vệ bắt đầu bằng biết mình có gì và ai có thể tấn công.', ['Lập inventory domain, host, data, repo, account và secret.', 'Vẽ trust boundary và abuse case quan trọng.', 'Đặt baseline patch, SSH, firewall, TLS, backup và logging.']],
        ['Identity và secret', 'Danh tính là control plane của hệ thống.', ['MFA, least privilege, access review và account cá nhân.', 'Dùng secret manager, credential ngắn hạn và rotation.', 'Chuẩn bị break-glass có audit và thời hạn.']],
        ['Secure delivery và workload', 'Chặn rủi ro trước khi artifact tới production.', ['Scan secret, dependency, SAST, image và IaC.', 'Pin dependency/image và ký/xác minh artifact khi phù hợp.', 'Giới hạn runtime user, capability, network và filesystem.']],
        ['Detection và response', 'Phải nhìn thấy hành vi bất thường và phục hồi sạch.', ['Thu auth, audit, edge, app và cloud log.', 'Alert theo hành vi có ngữ cảnh và owner.', 'Khoanh vùng, giữ bằng chứng, rotate secret, restore và RCA.']]
      ],
      lab: ['Hardening và incident drill', 'Hardening một server/app lab rồi giả lập token bị lộ.', ['Review exposure, SSH, user/sudo, firewall và update.', 'Quét repo/image/config, xử lý finding quan trọng.', 'Tạo detection cho đăng nhập thất bại hoặc truy cập path nhạy cảm.', 'Giả lập lộ token: revoke, rotate, tìm usage và viết timeline.'], ['Không có admin port public không cần thiết', 'Pipeline chặn secret thật', 'Log đủ tìm ai dùng credential', 'Có backup/rollback và RCA']],
      checks: [['Xóa secret khỏi Git đã đủ chưa?', 'Chưa. Secret có thể còn trong history/log/cache và đã bị sao chép; phải revoke/rotate rồi điều tra phạm vi sử dụng.'], ['SAST khác dependency scan?', 'SAST tìm pattern/lỗi trong code của bạn; dependency scan đối chiếu thư viện/version với lỗ hổng đã biết. Cần cả hai cùng review ngữ cảnh.'], ['Incident đầu tiên nên làm gì?', 'Xác nhận và khoanh phạm vi, giữ bằng chứng cần thiết, rồi containment có kiểm soát; không xóa log hoặc thay đổi hàng loạt.']],
      incident: ['Nghi có webshell trong upload', 'Một file thực thi lạ xuất hiện và process web tạo kết nối ra ngoài.', ['Cô lập workload/host khỏi traffic cần thiết nhưng giữ bằng chứng.', 'Lưu process, socket, hash, timestamp và log liên quan.', 'Rotate credential từ môi trường sạch và rebuild từ artifact tin cậy.', 'Vá upload validation/execution, săn IOC và cập nhật detection.']]
    },
    labs: {
      duration: '20-30 giờ', prerequisite: 'Hoàn thành tối thiểu phase 1-6',
      outcome: 'Tạo portfolio bằng dự án có thiết kế, triển khai, lỗi giả lập, verify và RCA.',
      chapters: [
        ['Thiết kế deliverable', 'Mỗi lab phải tạo bằng chứng có thể xem lại.', ['Viết mục tiêu, phạm vi và tiêu chí hoàn thành.', 'Vẽ sơ đồ, liệt kê dependency và rủi ro.', 'Lưu code, config mẫu, screenshot/output và runbook.']],
        ['Build theo milestone', 'Chia dự án thành các lát nhỏ chạy được.', ['Foundation trước, data sau, delivery và observability tiếp theo.', 'Mỗi milestone có smoke test và commit/tag.', 'Không thêm Kubernetes trước khi Docker/network chưa rõ.']],
        ['Break and recover', 'Cố tình gây lỗi để biến kiến thức thành kỹ năng.', ['Làm chết upstream, đầy disk, sai secret hoặc probe.', 'Điều tra bằng bằng chứng, không xem trước đáp án.', 'Đo MTTD/MTTR và viết RCA sau mỗi lỗi.']],
        ['Bàn giao', 'Dự án hoàn thành khi người khác có thể vận hành.', ['Có README, architecture, env inventory và release process.', 'Có backup/restore, monitoring/alert và security checklist.', 'Demo rollback và một incident drill.']]
      ],
      lab: ['Capstone DevOps end-to-end', 'Triển khai app + DB từ Git tới production lab có CI/CD, monitoring, backup và security.', ['Dựng hạ tầng và app bằng code, version rõ.', 'Tạo pipeline test/scan/build/deploy/verify.', 'Bật dashboard, alert, backup và restore drill.', 'Gây hai sự cố, khôi phục và nộp RCA.'], ['URL HTTPS hoạt động', 'Rollback release trong thời gian mục tiêu', 'Restore dữ liệu thành công', 'Alert có runbook và security review']],
      checks: [['Một lab được xem là hoàn thành khi nào?', 'Khi đạt tiêu chí kiểm chứng, lưu đủ bằng chứng và người khác có thể làm lại theo tài liệu.'], ['Vì sao phải cố tình tạo lỗi?', 'Để học dấu hiệu hỏng, lệnh chẩn đoán và quy trình phục hồi trước khi gặp production thật.'], ['Portfolio nên thể hiện gì ngoài ảnh giao diện?', 'Sơ đồ, code/config, pipeline, quyết định trade-off, kiểm thử, metric, runbook và RCA.']],
      incident: ['Demo capstone bị lỗi trước khi bàn giao', 'Release mới làm migration không tương thích.', ['Dừng deploy và bảo vệ dữ liệu.', 'Rollback app nếu schema còn tương thích hoặc phục hồi theo runbook.', 'Verify chức năng và dữ liệu.', 'Sửa migration theo expand/contract rồi diễn tập lại.']]
    },
    deploy: {
      duration: '12-18 giờ', prerequisite: 'Hoàn thành các module cốt lõi',
      outcome: 'Triển khai một hệ thống từ server trống tới production có thể quan sát, backup và rollback.',
      chapters: [
        ['Chuẩn bị và hardening', 'Chốt kiến trúc, DNS, account, port, data và RPO/RTO trước khi cài.', ['Tạo user deploy/admin riêng và SSH key.', 'Update, firewall, time sync, audit và baseline.', 'Lập inventory secret, domain, certificate và owner.']],
        ['Runtime và data', 'Cài runtime có version, process manager và data lifecycle rõ.', ['Pin package/image, env quyền tối thiểu và healthcheck.', 'Dựng database role, migration và backup.', 'Tách release, shared data, log và cache.']],
        ['Proxy, TLS và release', 'Đưa traffic vào qua lớp kiểm soát và release bất biến.', ['Dựng Nginx/LB, TLS, header, limit và log.', 'Deploy bằng tag/artifact, smoke test và metric gate.', 'Giữ release cũ và lệnh rollback đã thử.']],
        ['Operate và handover', 'Production cần người trực có đủ tín hiệu và tài liệu.', ['Bật metrics/logs/alert với owner/runbook.', 'Thực hiện restore drill và certificate expiry alert.', 'Bàn giao sơ đồ, access, deploy, rollback, backup và contact.']]
      ],
      lab: ['Từ VPS trống tới production', 'Triển khai capstone trên host/cluster mới và bàn giao cho một người khác vận hành.', ['Chuẩn bị checklist, user, network, DNS và security.', 'Dựng runtime, database, app, Nginx và TLS.', 'Chạy pipeline release, smoke test và rollback thử.', 'Bật monitoring/backup rồi nhờ người khác làm theo runbook.'], ['HTTPS và healthcheck ngoài Internet hoạt động', 'Không dùng root cho app', 'Rollback và restore test thành công', 'Tài liệu đủ để người khác deploy lại']],
      checks: [['Web chạy được đã gọi là production ready chưa?', 'Chưa. Cần security, observability, backup/restore, rollback, capacity, ownership và runbook.'], ['Khi deploy trả 502 nên rollback hay debug?', 'Nếu impact lớn và release cũ ổn, ưu tiên rollback để phục hồi; đồng thời giữ bằng chứng rồi debug ở môi trường an toàn.'], ['Bàn giao tối thiểu gồm gì?', 'Sơ đồ, inventory, access/owner, deploy/rollback, config/secret location, monitoring, backup/restore, incident contact và known risks.']],
      incident: ['Go-live xong certificate sai domain', 'DNS trỏ đúng nhưng Nginx phục vụ certificate của server block khác.', ['Giảm impact bằng quay về endpoint/cert ổn định nếu có.', 'Kiểm SNI, server_name và certificate path.', 'Cấp/chọn đúng certificate, nginx -t rồi reload.', 'Thêm kiểm tra SAN/expiry vào preflight và monitoring.']]
    },
    systeminternals: {
      duration: '18-24 giờ', prerequisite: 'Linux, Docker và Performance Tuning',
      outcome: 'Giải thích và kiểm soát được boot, process, syscall, memory, IO, cgroup v2, namespace, capability, LSM và audit trên host production.',
      chapters: [
        ['Từ boot tới userspace', 'Đọc chuỗi firmware, bootloader, kernel, initramfs, mount root filesystem và PID 1 để biết lỗi nằm trước hay sau systemd.', ['Đọc kernel command line, journal theo boot và unit critical path.', 'Hiểu module, sysctl, udev và thiết bị xuất hiện trong userspace.', 'Phân biệt thay đổi runtime với cấu hình bền vững qua reboot.']],
        ['Process, syscall và isolation', 'Container vẫn là process Linux dùng namespace, cgroup và security primitive của kernel.', ['Theo fork/exec, signal, file descriptor, socket và syscall.', 'Phân biệt PID, mount, network, user namespace và giới hạn của từng lớp.', 'Hiểu seccomp giảm syscall surface nhưng không tự tạo một sandbox hoàn chỉnh.']],
        ['CPU, memory và IO', 'Tối ưu production phải nối triệu chứng với scheduler, reclaim, page cache, pressure và block IO.', ['Đọc load average cùng run queue, CPU steal, iowait và PSI.', 'Phân biệt RSS, page cache, swap, memory pressure và OOM kill.', 'Dùng cgroup v2 phân phối CPU, memory, IO và pids theo workload.']],
        ['Identity và privilege trên host', 'Quyền Linux không dừng ở rwx; còn PAM, NSS, sudoers, ACL và capabilities.', ['Theo một lần đăng nhập qua NSS/PAM/session và audit.', 'Giảm quyền root bằng user riêng, sudo rule hẹp và Linux capabilities.', 'Review SUID/SGID, file capability, cron, systemd timer và authorized_keys.']],
        ['LSM, systemd sandbox và audit', 'Defense-in-depth kết hợp DAC, SELinux/AppArmor, seccomp, namespaces và unit sandboxing.', ['Đọc denial trước khi nới policy; không tắt LSM để né lỗi.', 'Áp dụng NoNewPrivileges, ProtectSystem, PrivateTmp và capability bounding.', 'Thiết kế audit rule có mục tiêu, retention và đồng bộ thời gian.']]
      ],
      lab: ['Harden một service và điều tra resource pressure', 'Chạy service bằng systemd với cgroup v2 và sandbox, sau đó gây memory/IO pressure để quan sát và khôi phục.', ['Chụp baseline boot, kernel, process tree, syscall surface và cgroup hierarchy.', 'Tạo unit user riêng, read-only filesystem, private tmp, capability tối thiểu và resource limit.', 'Gây memory pressure trong lab; đọc PSI, cgroup events, journal và OOM evidence.', 'Khôi phục service, so sánh attack surface trước/sau và ghi exception còn lại.'], ['systemd-analyze security có giải thích cho từng exception', 'Service không chạy root và không ghi ngoài path cho phép', 'Resource event được thấy ở cgroup/journal/metric', 'Có rollback unit và evidence sau reboot']],
      checks: [['Load average cao có đồng nghĩa CPU luôn bận không?', 'Không. Load còn gồm task chờ không ngắt được, thường liên quan IO; phải đọc run queue, iowait, PSI và trạng thái process.'], ['memory.max của cgroup khác RAM host thế nào?', 'memory.max giới hạn workload trong cgroup; khi vượt có thể reclaim hoặc OOM trong cgroup mà host vẫn còn RAM.'], ['Seccomp có phải sandbox hoàn chỉnh không?', 'Không. Seccomp chỉ lọc syscall; cần kết hợp user/capability, namespace, filesystem policy, LSM và network controls.'], ['Capability tốt hơn chạy root ở điểm nào?', 'Chỉ cấp một nhóm đặc quyền kernel cần thiết thay toàn bộ quyền root, nhưng vẫn phải review vì một số capability rất mạnh.']],
      incident: ['Service lạ tồn tại sau reboot', 'Host có unit mới, process chạy quyền cao và kết nối ra ngoài dù app chính vẫn bình thường.', ['Không xóa ngay; lưu unit, process tree, executable hash, socket, journal và timeline.', 'Khoanh network/credential theo mức cần thiết và giữ kênh điều tra sạch.', 'So sánh package/file integrity, timer/cron, authorized_keys, sudo và audit log.', 'Rebuild từ image tin cậy nếu integrity không chứng minh được; rotate secret và viết detection.']]
    },
    identitypki: {
      duration: '16-22 giờ', prerequisite: 'Security, Network và Vault',
      outcome: 'Thiết kế identity plane có MFA, federation, workload identity, PKI/mTLS, SSH CA, secret rotation và break-glass được audit.',
      chapters: [
        ['Authentication, authorization và session', 'Tách rõ chứng minh danh tính, cấp quyền và duy trì phiên để tránh dùng một token cho mọi mục đích.', ['Hiểu OIDC dùng cho authentication trên OAuth 2.0 và kiểm issuer, audience, nonce, state.', 'Thiết kế RBAC/ABAC theo resource, action, environment và thời hạn.', 'Quản session, refresh token, logout, revoke và step-up authentication.']],
        ['PKI và certificate lifecycle', 'Trust đến từ chain và policy vận hành, không chỉ từ việc có file certificate.', ['Tách root CA offline, intermediate CA và issuing profile.', 'Quản SAN, EKU, key usage, serial, expiry, renewal, CRL/OCSP.', 'Bảo vệ private key bằng permission, KMS/HSM và rotation có overlap.']],
        ['SSH và quyền quản trị', 'SSH CA và account cá nhân giảm phụ thuộc authorized_keys phân tán.', ['Cấp certificate ngắn hạn theo principal và source phù hợp.', 'Tách deploy, operator, admin và break-glass; không dùng chung root account.', 'Audit sudo/SSH, thu hồi quyền và kiểm tra key/cert hết hạn.']],
        ['Workload identity và mTLS', 'Service nên nhận identity ngắn hạn dựa trên môi trường chạy thay vì secret tĩnh.', ['Dùng cloud workload identity hoặc mô hình SPIFFE/SPIRE khi phù hợp.', 'Xác minh cả client và server trong mTLS cùng policy authorization.', 'Thiết kế trust domain, rotation và failure mode khi CA/issuer gián đoạn.']],
        ['Secret lifecycle và emergency access', 'Secret phải có owner, scope, TTL, rotate, revoke và audit.', ['Ưu tiên dynamic credential/lease cho database và automation.', 'Ngăn secret đi vào Git, image, log, crash dump và shell history.', 'Break-glass phải có MFA, approval, alert tức thời và post-review.']]
      ],
      lab: ['Dựng identity plane nhỏ có PKI và credential ngắn hạn', 'Tạo CA lab, cấp mTLS cho hai service, SSH certificate cho operator và dynamic database credential.', ['Tạo root/intermediate CA lab, profile riêng cho server và client.', 'Cấu hình mTLS, test đúng identity được phép và certificate sai bị từ chối.', 'Cấp SSH certificate TTL ngắn theo principal; thu hồi quyền cũ.', 'Cấp dynamic DB credential, quan sát lease, revoke và audit trail.'], ['Không có private key hoặc token trong repo/log', 'Certificate kiểm đúng SAN/EKU/chain', 'SSH và DB credential tự hết hạn hoặc revoke được', 'Break-glass tạo alert và có bằng chứng review']],
      checks: [['OAuth 2.0 và OIDC khác nhau ở đâu?', 'OAuth 2.0 là khung authorization; OIDC bổ sung lớp authentication và ID Token/claims. Không dùng access token như bằng chứng đăng nhập nếu protocol không quy định.'], ['Vì sao mTLS chưa đủ để authorization?', 'mTLS chứng minh certificate identity; hệ thống vẫn cần policy ánh xạ identity đó được gọi resource/action nào.'], ['Root CA nên online liên tục không?', 'Thông thường không. Root CA nên được bảo vệ mạnh và dùng hiếm; intermediate CA thực hiện cấp phát thường ngày để giảm blast radius.'], ['Xóa secret khỏi file có giải quyết lộ secret không?', 'Không. Phải revoke/rotate, tìm mọi nơi secret đã lan tới và kiểm audit xem có bị sử dụng hay không.']],
      incident: ['CI token có quyền production bị lộ', 'Token xuất hiện trong log build công khai và có thời hạn dài.', ['Revoke token trước, đóng đường deploy bị ảnh hưởng và giữ log/audit.', 'Tìm mọi lần token được dùng, artifact/release đã tạo và thay đổi production.', 'Rotate credential liên quan, xác minh integrity của release và registry.', 'Chuyển pipeline sang OIDC credential ngắn hạn, scope theo environment và approval.']]
    },
    networkdefense: {
      duration: '18-24 giờ', prerequisite: 'CCNA, Nginx và Security',
      outcome: 'Thiết kế segmentation, host firewall, secure edge, private administration, DNS/TLS controls và network detection có evidence.',
      chapters: [
        ['Packet path, conntrack và nftables', 'Muốn viết policy đúng phải biết packet đi qua route, hook, state table, NAT và socket nào.', ['Theo packet ingress/forward/output và conntrack state.', 'Dùng nftables set/map/chain rõ ràng, default deny có exception được quản.', 'Kiểm rp_filter, forwarding, NAT và interaction với Docker/Kubernetes.']],
        ['Segmentation và private administration', 'Chia zone theo trust và data flow thay vì theo sơ đồ tổ chức.', ['Tách edge, app, data, management, backup và monitoring.', 'Quản trị qua WireGuard/Tailscale/VPN với identity và device policy.', 'Kiểm cả north-south lẫn east-west, IPv4 lẫn IPv6.']],
        ['DNS, TLS và secure edge', 'DNS và TLS là hai control plane quan trọng của đường vào dịch vụ.', ['Quản authoritative DNS, DNSSEC khi phù hợp, CAA và thay đổi có audit.', 'Thiết kế TLS version/cipher, certificate automation, HSTS có kế hoạch.', 'Tách CDN/WAF/LB/Nginx origin và bảo vệ đường bypass origin.']],
        ['Abuse control và availability', 'Rate limit, quota và backpressure phải gắn với identity, cost và hành vi.', ['Giới hạn login, upload, expensive API và connection concurrency.', 'Dùng timeout/retry/circuit breaker tránh khuếch đại sự cố.', 'Chuẩn bị DDoS runbook, upstream contact và degraded mode.']],
        ['Network telemetry và response', 'Flow, DNS, proxy, firewall và packet capture phải nối được cùng timeline.', ['Thu log allow/deny có sampling hợp lý và đồng bộ thời gian.', 'Dùng tcpdump/pcap có phạm vi, bảo vệ dữ liệu nhạy cảm.', 'Viết detection cho scanning, beaconing, unusual egress và policy drift.']]
      ],
      lab: ['Xây bốn security zone và diễn tập đường bypass', 'Tách edge/app/data/admin, chỉ cho phép data flow đã vẽ và quản trị qua mạng riêng.', ['Vẽ flow matrix nguồn, đích, port, identity, owner và lý do.', 'Triển khai nftables/SG/NetworkPolicy default deny theo từng lớp.', 'Ẩn origin khỏi Internet, bật TLS/WAF/rate limit và private admin path.', 'Gây lỗi rule và thử egress bất thường; điều tra bằng conntrack, log và pcap.'], ['Port scan ngoài chỉ thấy dịch vụ public dự kiến', 'Data zone chỉ nhận từ app identity/segment', 'IPv6 không tạo đường bypass', 'Mỗi deny quan trọng có log và runbook xử lý']],
      checks: [['Default deny có đủ để gọi là segmentation tốt không?', 'Chưa. Cần flow inventory, owner, exception lifecycle, kiểm cả chiều về/egress/IPv6 và test liên tục.'], ['Tại sao Docker/Kubernetes có thể làm firewall host khó hiểu?', 'Runtime tạo interface, route, NAT và chain riêng; policy phải kiểm packet path thực và thứ tự hook thay vì chỉ nhìn một rule file.'], ['Rate limit theo IP có nhược điểm gì?', 'NAT làm nhiều user chung IP, attacker phân tán IP, IPv6 thay đổi; nên kết hợp identity, route, cost và device/context.'], ['WAF có thay thế validate input trong app không?', 'Không. WAF giảm một phần lưu lượng xấu ở edge; app vẫn phải validate, authorize và xử lý dữ liệu an toàn.']],
      incident: ['Origin bị gọi trực tiếp để bỏ qua WAF', 'Traffic độc tới public IP của origin và không có header/identity từ edge.', ['Chặn hoặc hạn chế origin chỉ nhận từ edge/private network trước.', 'Xác minh route DNS, certificate, security group và firewall host.', 'Đổi origin credential nếu đã lộ, review log để xác định impact.', 'Thêm origin authentication/mTLS, exposure scan và alert drift.']]
    },
    secureplatform: {
      duration: '20-28 giờ', prerequisite: 'Architecture, Deploy, Database và Monitoring',
      outcome: 'Thiết kế platform HA có immutable release, zero-downtime deploy, migration an toàn, policy gate, capacity plan và rollback đã diễn tập.',
      chapters: [
        ['Requirement, SLO và failure domain', 'Master deployment bắt đầu từ mục tiêu dịch vụ và failure mode, không bắt đầu từ công cụ.', ['Chốt SLI/SLO, RPO/RTO, data classification và compliance constraint.', 'Vẽ dependency, SPOF, capacity envelope và failure domain.', 'Ghi assumption, trade-off, cost và tiêu chí chấp nhận rủi ro.']],
        ['Immutable artifact và environment contract', 'Một release phải truy được source, build, config schema và runtime requirement.', ['Build một lần, pin digest/version và tách config/secret khỏi artifact.', 'Định nghĩa health, readiness, dependency và migration contract.', 'Quản config version, feature flag và compatibility matrix.']],
        ['HA, state và database change', 'HA thật cần xử lý consistency, session, queue, cache và failover data.', ['Tách stateless app; chọn replication/failover phù hợp workload.', 'Thiết kế connection pool, timeout, retry budget và idempotency.', 'Dùng expand/contract migration, backfill quan sát được và rollback plan.']],
        ['Progressive delivery và automated verification', 'Rolling, blue-green và canary phải có metric gate thay vì chỉ chờ pod Ready.', ['Định nghĩa preflight, smoke, synthetic và business transaction test.', 'So sánh canary với baseline theo error, latency, saturation và data correctness.', 'Tự động halt/rollback nhưng giữ evidence để phân tích.']],
        ['Operate, change control và evidence', 'Platform production phải chứng minh được ai đổi gì, vì sao và hệ thống phản ứng ra sao.', ['Mỗi change có owner, risk, plan, verify và rollback.', 'Theo certificate, backup, capacity, patch, access và configuration drift.', 'Chạy game day, restore drill, failover drill và review action item.']]
      ],
      lab: ['Zero-downtime release cho hệ thống ba tầng', 'Dựng LB, hai app instance, database và queue; triển khai schema change tương thích rồi canary release.', ['Đo baseline SLI và xác định failure budget cho lab.', 'Build artifact immutable, triển khai blue-green/canary với health/readiness đúng.', 'Thực hiện expand/contract migration và backfill có progress metric.', 'Gây lỗi canary, tự rollback; sau đó fail một instance và diễn tập restore.'], ['Không mất request vượt ngưỡng cho phép khi deploy', 'Rollback app không bị schema mới chặn', 'Failover và restore đạt RTO/RPO lab', 'Release record có artifact digest, metric và decision log']],
      checks: [['Hai replica có chắc là HA không?', 'Không. Nếu cùng host/AZ, dùng chung state SPOF hoặc LB/DNS không failover thì hai replica vẫn hỏng cùng lúc.'], ['Readiness 200 có đủ làm canary gate không?', 'Không. Cần error/latency, resource, dependency và business/data correctness so với baseline.'], ['Vì sao migration expand/contract hỗ trợ rollback?', 'Schema được mở rộng để cả version cũ và mới cùng chạy; chỉ xóa phần cũ sau khi code/data đã chuyển và ổn định.'], ['Retry làm hệ thống đáng tin hơn trong mọi trường hợp không?', 'Không. Retry thiếu budget/backoff/idempotency có thể nhân tải và gây retry storm.']],
      incident: ['Canary tốt nhưng rollout toàn bộ làm DB quá tải', 'Một pod canary không tạo đủ concurrency để lộ connection amplification.', ['Dừng rollout và giảm traffic/version mới để phục hồi.', 'Đo connection pool, query rate, lock và saturation theo revision.', 'Sửa pool/batch/query hoặc capacity; load test theo traffic thật.', 'Bổ sung canary ramp nhiều bước và DB saturation gate.']]
    },
    supplychain: {
      duration: '18-24 giờ', prerequisite: 'GitOps, CI/CD, Docker và Security',
      outcome: 'Bảo vệ source-to-production bằng protected workflow, SBOM, provenance SLSA 1.2, signing Sigstore, registry policy và admission verification.',
      chapters: [
        ['Threat model chuỗi cung ứng', 'Theo từng trust boundary từ developer, source, dependency, runner, registry tới deploy controller.', ['Xác định ai có thể thay source, workflow, dependency, artifact và policy.', 'Tách compromise source khỏi compromise build platform.', 'Định nghĩa artifact identity và bằng chứng cần verify trước deploy.']],
        ['Source và dependency controls', 'Review source không có ý nghĩa nếu workflow hoặc dependency có thể đổi ngoài kiểm soát.', ['Protected branch, CODEOWNERS, signed/reviewed change và least privilege.', 'Pin action/dependency theo digest/version; quản lockfile và update bot.', 'Quét secret, license, dependency risk và malicious package indicators.']],
        ['Build isolation và provenance', 'SLSA 1.2 mô tả mức đảm bảo cho source/build và provenance có thể xác minh.', ['Dùng hosted/ephemeral isolated runner phù hợp mức rủi ro.', 'Tạo provenance từ build service, gắn source, builder, parameters và artifact digest.', 'Không để job tùy ý tự khai bằng chứng mà verifier tin vô điều kiện.']],
        ['SBOM, signing và registry', 'SBOM mô tả thành phần; chữ ký/provenance trả lời artifact đến từ đâu và có bị đổi không.', ['Tạo SBOM chuẩn, liên kết với image digest và lưu cùng artifact.', 'Ký keyless bằng OIDC/Sigstore hoặc KMS theo mô hình trust.', 'Bật immutable tag, retention, quarantine và vulnerability re-scan.']],
        ['Verification và deployment policy', 'Giá trị nằm ở verify trước khi chạy, không chỉ tạo thêm file metadata.', ['Verify signature identity, issuer, digest và attestation predicate.', 'Admission/policy chỉ nhận artifact từ builder/repo/branch được phép.', 'Thiết kế break-glass, audit, expiry và cách xử lý key/root compromise.']]
      ],
      lab: ['Pipeline có SBOM, provenance và signed admission', 'Build image bằng runner tách biệt, sinh SBOM/provenance, ký keyless rồi chặn image không đạt policy.', ['Threat model repo, workflow, runner, registry và deploy identity.', 'Pin dependency/action, build image theo digest và sinh SBOM.', 'Tạo provenance SLSA, ký bằng identity CI ngắn hạn và push registry.', 'Verify identity/issuer/attestation trước deploy; thử image unsigned và provenance sai.'], ['Image unsigned hoặc sai issuer bị chặn', 'SBOM/provenance gắn đúng digest đang deploy', 'CI không giữ signing key dài hạn', 'Break-glass có approval, TTL và audit event']],
      checks: [['SBOM có chứng minh artifact an toàn không?', 'Không. SBOM là inventory; cần vulnerability/context review, provenance, signature, policy và runtime controls.'], ['Ký tag image thay vì digest có rủi ro gì?', 'Tag có thể bị trỏ sang manifest khác; verification và policy nên ràng buộc digest bất biến.'], ['SLSA provenance tự khai trong cùng script có đáng tin không?', 'Mức tin phụ thuộc builder và cách provenance được tạo/bảo vệ; job bị kiểm soát không nên tự ký mọi claim mà verifier tin.'], ['Keyless signing có nghĩa là không có key không?', 'Vẫn có key tạm thời; OIDC identity được CA liên kết với certificate ngắn hạn và sự kiện được ghi để verifier kiểm identity/issuer.']],
      incident: ['Registry có image hợp lệ nhưng source không tương ứng', 'Digest được ký bởi CI identity nhưng workflow build đã bị sửa trái phép.', ['Dừng promotion và lưu repo audit, workflow revision, provenance, runner/registry log.', 'Xác định signing identity đúng nhưng source/workflow trust boundary đã hỏng.', 'Revoke phiên/quyền, bảo vệ workflow bằng review/owner và rebuild từ commit tin cậy.', 'Tăng policy kiểm builder, repo, ref, workflow identity và provenance predicate.']]
    },
    cloudk8ssecurity: {
      duration: '22-30 giờ', prerequisite: 'Cloud, Kubernetes, IAM và Supply Chain',
      outcome: 'Harden cloud/Kubernetes từ organization IAM tới workload runtime bằng PSS Restricted, admission policy, network isolation, workload identity và detection.',
      chapters: [
        ['Cloud landing zone và IAM guardrail', 'Security cluster bắt đầu từ organization/account, identity và audit plane bên ngoài cluster.', ['Tách account/project, production, security log và backup.', 'Federation/MFA, role ngắn hạn, SCP/org policy và permission boundary.', 'Bật immutable audit trail, config inventory và detection ở control plane.']],
        ['Kubernetes control plane và RBAC', 'Giảm blast radius của credential, API access và controller có quyền cao.', ['Private endpoint khi phù hợp, audit policy và encryption at rest.', 'RBAC theo verb/resource/namespace; tránh wildcard và cluster-admin.', 'Bảo vệ etcd, bootstrap token, kubeconfig, service account token và upgrade path.']],
        ['Admission và Pod Security Standards', 'Dùng Pod Security Admission Baseline/Restricted làm chuẩn tối thiểu rồi bổ sung policy theo tổ chức.', ['Enforce namespace label theo version; audit/warn trước enforce.', 'Chặn privileged, host namespace/path, privilege escalation và capability thừa.', 'Yêu cầu runAsNonRoot, seccomp RuntimeDefault và filesystem read-only khi app hỗ trợ.']],
        ['Workload, network và data isolation', 'Namespace không tự là security boundary đầy đủ.', ['Default-deny NetworkPolicy cả ingress/egress và kiểm DNS path.', 'Dùng workload identity thay cloud key trong Secret.', 'Tách node pool/runtime class cho workload đặc quyền hoặc không tin cậy.']],
        ['Runtime detection và response', 'Admission chặn cấu hình xấu; runtime detection tìm hành vi bất thường sau khi pod chạy.', ['Thu Kubernetes audit, cloud control plane, DNS, network flow và workload event.', 'Detect exec shell, sensitive mount, unexpected process/egress và credential use.', 'Có playbook cordon/isolate/snapshot/rebuild mà không phá evidence.']]
      ],
      lab: ['Secure namespace từ deploy tới runtime', 'Tạo namespace Restricted, policy-as-code, signed image verification, workload identity, NetworkPolicy và runtime alert.', ['Baseline cluster/RBAC/audit và tách admin khỏi deploy identity.', 'Bật PSS warn/audit rồi enforce Restricted theo version.', 'Áp policy image source/signature, resource, securityContext và default-deny network.', 'Giả lập manifest privileged và egress lạ; xác minh admission/detection/playbook.'], ['Pod vi phạm Restricted bị chặn với lý do rõ', 'App không có cloud key tĩnh và không dùng cluster-admin', 'Image sai provenance bị chặn trước runtime', 'Runtime event nối được pod, image digest, identity và audit log']],
      checks: [['Pod Security Policy còn là hướng triển khai hiện tại không?', 'Không. PSP đã bị loại bỏ; dùng Pod Security Admission/Standards và policy engine như Kyverno/Gatekeeper khi cần rule bổ sung.'], ['Namespace có phải hard security boundary không?', 'Không hoàn toàn. RBAC, NetworkPolicy, node/runtime isolation, admission và cloud IAM vẫn phải tạo boundary; workload đặc quyền có thể vượt nhiều lớp.'], ['runAsNonRoot có tự bảo vệ host không?', 'Không. Còn capability, seccomp, mount, host namespace, kernel vulnerability, network và credential.'], ['Vì sao admission không thay runtime detection?', 'Admission chỉ đánh giá object lúc tạo/cập nhật; hành vi process/network sau khi chạy hoặc credential bị dùng ngoài cluster cần telemetry runtime/control plane.']],
      incident: ['ServiceAccount bị dùng để tạo workload đặc quyền', 'Audit log cho thấy token workload gọi API ngoài hành vi bình thường.', ['Thu audit, token audience/subject, pod/image/node và network timeline.', 'Cô lập namespace/workload, revoke/rotate credential và chặn policy bypass.', 'Review RBAC binding, automount token, admission exception và image provenance.', 'Rebuild workload, hunt cùng identity/IOC và thêm detection theo behavior.']]
    },
    forensics: {
      duration: '20-28 giờ', prerequisite: 'Incident Response, Linux Internals, Cloud/K8s Security',
      outcome: 'Thu thập evidence host/container/cloud có integrity, dựng timeline, khoanh vùng, phục hồi sạch và chuyển phát hiện thành detection mới.',
      chapters: [
        ['Readiness và chain of custody', 'Forensics tốt được chuẩn bị trước incident bằng clock, retention, access và công cụ sạch.', ['Định nghĩa case ID, scope, legal/privacy owner và evidence location.', 'Ghi người thu, thời gian, nguồn, phương pháp, hash và mọi lần bàn giao.', 'Đồng bộ UTC/timezone và bảo vệ log khỏi bị workload sửa/xóa.']],
        ['Volatile evidence trên host', 'Process, memory, socket, login và mount có thể mất sau reboot hoặc containment.', ['Chụp process tree, command line, open file, socket, route và logged-in user.', 'Lấy journal/audit/auth/kernel log và persistence location.', 'Ưu tiên acquisition theo volatility nhưng không chạy công cụ phá evidence.']],
        ['Filesystem và timeline', 'Mục tiêu là nối file/process/identity/network thành chuỗi sự kiện.', ['Hash artifact, lưu metadata, owner, timestamp và package provenance.', 'Tìm systemd/cron/SSH/profile/library persistence và file mới đổi.', 'Chuẩn hóa timestamp, phân biệt event time với ingest time và clock skew.']],
        ['Container, Kubernetes và cloud evidence', 'Ephemeral workload đòi hỏi log/evidence nằm ngoài node và pod.', ['Lưu manifest, events, audit, image digest, runtime/container log và node mapping.', 'Thu cloud IAM, API activity, flow log, snapshot metadata và KMS/secret access.', 'Liên kết principal, session, workload identity và artifact provenance.']],
        ['Contain, eradicate, recover và improve', 'Không thể tin host bị chiếm quyền chỉ vì đã xóa file nghi ngờ.', ['Contain theo blast radius và business impact; giữ đường điều tra sạch.', 'Rebuild từ known-good artifact, rotate trust root/secret và restore data đã verify.', 'Viết root cause, detection gap, control failure và action item có owner/hạn.']]
      ],
      lab: ['Điều tra credential misuse và persistence trong môi trường lab', 'Giả lập account deploy bị dùng tạo systemd persistence và kết nối outbound; điều tra host cùng control-plane log.', ['Mở case, ghi scope và lấy volatile evidence trước khi restart.', 'Hash/configure evidence store read-only, dựng timeline host/auth/network.', 'Khoanh identity và host, rebuild service từ artifact đã xác minh.', 'Viết incident report theo NIST SP 800-61r3 và tạo detection cho dấu hiệu đã bỏ sót.'], ['Evidence có hash, nguồn, UTC và chain-of-custody', 'Timeline phân biệt fact, inference và unknown', 'Recovery dùng known-good artifact và credential mới', 'RCA tạo control/detection có test xác nhận']],
      checks: [['Có nên reboot host nghi bị xâm nhập ngay không?', 'Không mặc định. Reboot làm mất volatile evidence và có thể kích hoạt behavior khác; quyết định theo safety/impact sau khi lưu tối thiểu bằng chứng cần thiết.'], ['Hash evidence chứng minh điều gì?', 'Giúp chứng minh file không đổi từ lúc thu; không tự chứng minh nguồn ban đầu hoặc tính hợp pháp của nội dung.'], ['Containment và eradication khác nhau?', 'Containment giới hạn impact/lan rộng; eradication loại persistence/root cause. Sau đó recovery phải đưa hệ thống sạch trở lại.'], ['Vì sao rebuild thường đáng tin hơn dọn từng file?', 'Khi host integrity mất, khó chứng minh đã tìm hết persistence; rebuild từ image/artifact tin cậy tạo baseline có thể xác minh.']],
      incident: ['Kẻ tấn công dùng living-off-the-land', 'Không có binary malware rõ ràng; hoạt động dùng shell, curl, systemd và cloud CLI hợp lệ.', ['Nối identity, command line, parent process, destination và API action thay vì tìm hash malware.', 'Contain account/session, egress và workload bị ảnh hưởng nhưng giữ audit trail.', 'Xác định entry point, privilege path, persistence và data access.', 'Tạo detection behavior-based, giảm quyền và thêm egress/control-plane guardrail.']]
    },
    systemrecovery: {
      duration: '28-36 giờ', prerequisite: 'Linux Internals, Database, Backup & DR, IaC và Incident Response',
      outcome: 'Tự triage lỗi boot/storage/service/data, chọn repair hoặc rebuild đúng rủi ro, phục hồi host/cluster từ nguồn tin cậy và chứng minh RTO/RPO bằng bài diễn tập.',
      chapters: [
        ['Recovery strategy và readiness', 'Khôi phục bắt đầu trước sự cố bằng inventory, dependency map, recovery tier và quyền truy cập khẩn cấp.', ['Phân biệt rollback, repair, restore, rebuild, failover và failback.', 'Định nghĩa RPO/RTO theo business service thay vì theo từng server rời rạc.', 'Chuẩn bị console, rescue media, encryption key, backup credential và contact theo mô hình tách quyền.']],
        ['Boot, initramfs và early userspace', 'Xác định lỗi nằm ở firmware/UEFI, bootloader, kernel, initramfs, root filesystem hay systemd target.', ['Đọc kernel command line, boot entry, journal boot trước và emergency/rescue target.', 'Sửa fstab, initramfs hoặc bootloader từ rescue environment có mount/chroot đúng.', 'Giữ đường quay lại kernel/initramfs cũ và kiểm cả reboot thứ hai.']],
        ['Block device, volume và filesystem', 'Không sửa filesystem trước khi hiểu thiết bị vật lý, RAID/LVM, encryption, mount và dấu hiệu hỏng phần cứng.', ['Vẽ lại chain disk -> RAID -> LUKS -> LVM -> filesystem -> mount.', 'Ưu tiên read-only, snapshot/image và lệnh kiểm tra không ghi trước khi repair.', 'Phân biệt filesystem repair với data recovery; dừng khi phần cứng tiếp tục phát sinh lỗi.']],
        ['OS, network và service recovery', 'Một máy boot được chưa có nghĩa là service đã an toàn hoặc cấu hình đúng.', ['Xác minh package/file integrity, systemd dependency, DNS, route, firewall, certificate và secret.', 'Khôi phục config từ Git/config management hoặc image known-good thay vì vá tay không truy vết.', 'Rebuild host bằng IaC/automation khi integrity, thời gian sửa hoặc độ lặp lại không đạt yêu cầu.']],
        ['Application, database và control-plane recovery', 'State phải được phục hồi tới điểm nhất quán giữa database, object, queue, config và schema ứng dụng.', ['Chọn full restore, PITR hoặc logical recovery theo corruption window và RPO.', 'Kiểm version, checksum, WAL/binlog, migration và transaction/business invariant trước khi mở traffic.', 'Với Kubernetes, bảo vệ cả etcd/control plane, manifest, secret, persistent data và external dependency.']],
        ['Failover, validation và failback', 'Recovery hoàn tất khi user journey đúng, security boundary được dựng lại và hệ thống có thể vận hành bền vững.', ['Khôi phục dependency theo thứ tự, chuyển traffic có TTL/session/cache plan và giao tiếp sự cố rõ.', 'Kiểm technical health, synthetic transaction, data reconciliation, access, telemetry và backup mới.', 'Failback là một change riêng có freeze, replication direction, rollback và post-recovery review.']]
      ],
      lab: ['Blackout Recovery: mất host, lỗi boot và mất dữ liệu', 'Trong lab tách biệt, làm hỏng boot entry của host ứng dụng, xóa một tập bản ghi sau mốc backup rồi giả lập mất control plane chính.', ['Mở recovery bridge, chốt impact, recovery point, RTO/RPO và decision log.', 'Boot bằng rescue media; thu inventory read-only rồi phục hồi boot hoặc quyết định clean rebuild.', 'Dựng host thay thế bằng IaC/config management, rotate credential và verify artifact/config.', 'Khôi phục PostgreSQL tới thời điểm ngay trước thao tác xóa; reconcile dữ liệu và schema.', 'Restore etcd vào control plane lab tương thích, nối lại workload state và persistent data.', 'Chuyển traffic, chạy synthetic/security/observability checks, tạo backup mới rồi diễn tập failback.'], ['Không sửa trực tiếp bản evidence hoặc filesystem đang mounted read-write', 'Host thay thế tái lập được từ code và nguồn known-good', 'Database đạt recovery point đã chọn và pass business invariant', 'Control plane cùng workload/persistent data hoạt động nhất quán', 'RTO/RPO thực, decision log và mọi sai lệch đều có bằng chứng']],
      checks: [['Khi nào nên repair, khi nào nên rebuild?', 'Repair phù hợp khi integrity còn tin được, phạm vi rõ và sửa nhanh/an toàn hơn. Rebuild ưu tiên khi host bị compromise, drift lớn, lỗi khó chứng minh đã sạch hoặc automation có thể dựng lại đáng tin cậy.'], ['Có nên chạy fsck trên filesystem đang mount read-write?', 'Không. Trước hết dừng ghi, xác định loại filesystem, unmount hoặc dùng rescue environment; ưu tiên image/snapshot và chế độ kiểm tra không ghi trước khi repair.'], ['Backup có checksum tốt đã chứng minh restore được chưa?', 'Chưa. Checksum chỉ xác nhận các byte chưa đổi; vẫn phải restore cô lập và kiểm version, key, dependency, schema cùng business data.'], ['PITR khác restore full backup thế nào?', 'Full backup đưa dữ liệu về một mốc cố định; PITR replay WAL/binlog tới thời điểm hoặc transaction mục tiêu, cho phép giảm mất dữ liệu khi log liên tục còn đầy đủ.'], ['Failover thành công có cần failback ngay không?', 'Không. Trước tiên ổn định dịch vụ, xác minh data/security/telemetry. Failback phải là change riêng vì đảo replication và traffic có thể tạo thêm outage hoặc split-brain.']],
      incident: ['Sau cập nhật, primary không boot và dữ liệu mới bị xóa nhầm', 'Kernel mới dừng ở initramfs, replica chưa sẵn sàng nhận toàn bộ traffic và thao tác xóa xảy ra sau full backup gần nhất.', ['Đóng băng thay đổi, bảo vệ WAL/binlog/backup và xác định transaction/time cần phục hồi.', 'Dùng console phân loại boot failure; chọn kernel cũ để giảm impact hoặc clean rebuild nếu host không còn đáng tin.', 'Khôi phục database cô lập bằng full backup cộng WAL/binlog tới trước thao tác xóa rồi chạy reconciliation.', 'Dựng replacement từ code, rotate trust material nếu cần, canary traffic và theo dõi data correctness.', 'Chỉ failback sau khi replication, backup mới, security controls và game-day action item đã được xác minh.']]
    },
    mastercapstone: {
      duration: '40-60 giờ', prerequisite: 'Hoàn thành toàn bộ đường chính, Master Track và System Recovery Engineering',
      outcome: 'Bảo vệ được quyết định kiến trúc và chứng minh platform đáp ứng triển khai, security, reliability, incident response bằng evidence có thể kiểm tra.',
      chapters: [
        ['Architecture and risk brief', 'Chốt user journey, SLO, data, trust boundary, threat, failure mode và risk acceptance trước build.', ['Vẽ C4/data flow/trust boundary và asset inventory.', 'Định nghĩa SLO, RPO/RTO, capacity và compliance profile.', 'Lập risk register có likelihood, impact, control, owner và residual risk.']],
        ['Build secure platform', 'Tạo infrastructure, identity, network, workload và data plane bằng code.', ['IaC remote state/policy, private admin và segmented network.', 'Immutable artifact, SBOM/provenance/signature và controlled registry.', 'Kubernetes/host hardening, workload identity, backup và observability.']],
        ['Prove controls', 'Mỗi tuyên bố phải có evidence chứ không chỉ screenshot cấu hình.', ['Evidence access review, policy test, vulnerability triage và patch.', 'Evidence canary/rollback, clean-host rebuild, PITR/etcd restore, SLO và capacity test.', 'Evidence alert/runbook, audit retention và secret rotation.']],
        ['Game day và incident', 'Giám khảo chọn lỗi mà người học không biết trước.', ['Một availability failure, một security event và một scenario mất host/control-plane/data.', 'Đo MTTD/MTTA/MTTR, RPO/RTO, decision log và communication timeline.', 'Giữ evidence, containment, clean recovery, failback và RCA/action item.']],
        ['Technical defense và handover', 'Mastery thể hiện ở khả năng giải thích trade-off và bàn giao cho người khác vận hành.', ['Defense 60 phút: architecture, threat, controls, incident và known risks.', 'Operator khác thực hiện deploy/rollback/restore theo runbook.', 'Chốt backlog 30/60/90 ngày theo risk và cost.']]
      ],
      lab: ['Master Platform Defense', 'Triển khai hệ thống có web/API/DB/queue trên môi trường lab, bảo vệ supply chain và thực hiện game day mù.', ['Nộp architecture/risk brief trước khi chọn công cụ.', 'Build bằng IaC/pipeline; ký artifact; enforce identity/network/runtime policy.', 'Chạy load, canary, rollback, clean-host rebuild, PITR/etcd restore, access review và security validation.', 'Nhờ người khác inject availability, security và total-loss scenario; tự ứng cứu rồi bảo vệ quyết định trước rubric.'], ['Tất cả control quan trọng có evidence tái kiểm tra được', 'RTO/RPO/SLO được đo thay vì ước lượng', 'Không có critical finding chưa có risk owner/plan', 'Người khác bàn giao vận hành, recovery và failback được']],
      checks: [['Điều gì phân biệt capstone Master với demo công cụ?', 'Master capstone bắt đầu từ requirement/risk, chứng minh trade-off và outcome bằng test/evidence; công cụ chỉ là phương tiện.'], ['Có thể đạt Master nếu mọi lab đều làm theo đáp án từng bước không?', 'Chưa. Cần scenario mù, tự chọn giả thuyết/control, giải thích trade-off và xử lý thông tin thiếu.'], ['Một control được xem là hiệu quả khi nào?', 'Khi có mục tiêu rõ, owner, test/evidence, telemetry, failure mode, exception lifecycle và cải thiện sau incident.'], ['Điểm cao có cần hệ thống hoàn hảo không?', 'Không. Cần nhận diện residual risk trung thực, ưu tiên đúng và có kế hoạch giảm rủi ro khả thi.']],
      incident: ['Game day kết hợp supply-chain và production outage', 'Artifact được ký đúng identity nhưng build workflow bị sửa, release mới đồng thời làm DB saturation.', ['Khôi phục availability bằng halt/rollback có kiểm soát và bảo vệ dữ liệu.', 'Giữ source/workflow/provenance/registry/deploy/audit evidence để xác định trust boundary hỏng.', 'Rebuild bằng builder/workflow tin cậy, rotate identity và verify artifact trước redeploy.', 'Viết executive summary, technical RCA, detection/control changes và chứng minh bằng retest.']]
    }
  };

  const pathMasterModules = [
    {
      id: 'systeminternals', title: 'Linux Internals & Host Security', sub: 'Kernel, cgroup v2, LSM, audit', eyebrow: 'Master track · Host',
      h2: 'Linux Internals và bảo mật host production',
      lead: 'Đi từ boot và kernel tới process, resource control, privilege, systemd sandbox và audit. Mục tiêu không phải thuộc thêm lệnh mà là giải thích được vì sao host chậm, vì sao process có quyền và lớp nào thực sự chặn hành vi.',
      refs: [['Linux kernel admin guide', 'https://www.kernel.org/doc/html/latest/admin-guide/index.html'], ['Cgroup v2', 'https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html'], ['Seccomp BPF', 'https://docs.kernel.org/userspace-api/seccomp_filter.html']],
      rows: [
        ['Boot', 'Dựng timeline boot', 'Tách lỗi firmware/kernel/initramfs/mount/PID1 và tìm unit kéo dài critical path.', 'cat /proc/cmdline\nsystemd-analyze time\nsystemd-analyze critical-chain\njournalctl -b -1 -k --no-pager', 'Lưu output trước/sau thay đổi; reboot test trong maintenance window.'],
        ['Process', 'Theo process và file descriptor', 'Parent, command line, cwd, executable, open file và socket cho biết workload thật đang làm gì.', 'ps -eo pid,ppid,user,stat,etimes,cmd --forest\npstree -aps PID\nreadlink -f /proc/PID/exe\nls -lah /proc/PID/fd', 'Không chạy công cụ intrusive trên process nhạy cảm khi chưa đánh giá impact.'],
        ['Syscall', 'Quan sát syscall có phạm vi', 'Strace/perf giúp kiểm giả thuyết về file, network và wait nhưng có overhead.', 'strace -ff -ttT -p PID -o /tmp/trace.PID\nperf trace -p PID\ncat /proc/PID/status | grep -E "Seccomp|NoNewPrivs"', 'Chỉ dùng trên lab/canary hoặc thời gian ngắn; bảo vệ trace vì có thể chứa dữ liệu.'],
        ['Cgroup v2', 'Đọc resource boundary', 'Systemd unit/container được đặt trong hierarchy và controller CPU, memory, IO, pids.', 'stat -fc %T /sys/fs/cgroup\nsystemd-cgls\nsystemctl show SERVICE -p ControlGroup -p MemoryMax -p CPUQuotaPerSecUSec\ncat /sys/fs/cgroup/cgroup.controllers', 'Giới hạn cần load test; quá thấp tạo outage, quá cao không tạo isolation.'],
        ['Memory', 'Phân biệt pressure và leak', 'RSS, page cache, swap, PSI, reclaim và cgroup event phải đọc cùng nhau.', 'free -h\nvmstat 1\ncat /proc/pressure/memory\ngrep -E "oom|Out of memory|Killed process" /var/log/kern.log 2>/dev/null', 'Không drop cache hoặc disable OOM theo thói quen; tìm workload và nguyên nhân.'],
        ['IO', 'Khoanh block IO bottleneck', 'Latency, queue, utilization và process IO cho biết storage chậm hay app tạo tải sai.', 'iostat -xz 1\npidstat -d 1\ncat /proc/pressure/io\nfindmnt -o TARGET,SOURCE,FSTYPE,OPTIONS', 'Đối chiếu metric của volume/cloud; không benchmark phá hủy trên production.'],
        ['Privilege', 'Review đường tăng quyền', 'Sudo, SUID/SGID, file capability, group và service user là inventory đặc quyền.', 'sudo -l\ngetcap -r / 2>/dev/null\nfind / -xdev -type f -perm /6000 -ls 2>/dev/null\ngetent group sudo wheel 2>/dev/null', 'Mọi exception cần owner và lý do; so sánh với baseline định kỳ.'],
        ['Sandbox', 'Đánh giá systemd và LSM', 'Unit sandbox, SELinux/AppArmor, seccomp và audit bổ sung cho DAC thay vì thay thế nhau.', 'systemd-analyze security SERVICE\nsystemctl cat SERVICE\ngetenforce 2>/dev/null || aa-status 2>/dev/null\nauditctl -l 2>/dev/null', 'Đọc denial và test chức năng trước khi enforce; không tắt control để né lỗi.']
      ]
    },
    {
      id: 'identitypki', title: 'Identity, PKI & Secrets', sub: 'OIDC, mTLS, SSH CA, rotation', eyebrow: 'Master track · Identity',
      h2: 'Identity plane, PKI và vòng đời secret',
      lead: 'Thiết kế quyền người dùng và workload bằng credential ngắn hạn, trust chain có thể kiểm tra, mTLS, SSH CA, dynamic secret và break-glass được audit.',
      refs: [['OpenID specifications', 'https://openid.net/developers/specs/'], ['OpenID Connect Core', 'https://openid.net/specs/openid-connect-core-1_0.html'], ['Sigstore identity-based signing', 'https://docs.sigstore.dev/cosign/signing/overview/']],
      rows: [
        ['OIDC', 'Kiểm issuer metadata', 'Discovery cho biết endpoint, key và capability; verifier vẫn phải pin issuer/audience/algorithm.', 'curl -fsS https://ISSUER/.well-known/openid-configuration\ncurl -fsS https://ISSUER/.well-known/jwks.json', 'Không dán token thật vào công cụ web hoặc log; test bằng tenant lab.'],
        ['Claims', 'Review token contract', 'iss, aud, exp, nbf, sub, nonce và group/role phải có semantic rõ.', 'date -u\njq -r ".iss,.aud,.sub,.exp" decoded-payload.json', 'Decode không phải verify; signature, issuer, audience và thời gian đều phải được kiểm.'],
        ['PKI', 'Kiểm chain và SAN/EKU', 'Hostname/SPIFFE ID, EKU và chain quyết định certificate dùng đúng mục đích hay không.', 'openssl s_client -connect HOST:443 -servername HOST -showcerts </dev/null\nopenssl x509 -in cert.pem -noout -subject -issuer -serial -dates -ext subjectAltName -ext extendedKeyUsage\nopenssl verify -CAfile chain.pem cert.pem', 'Không dùng -k hoặc bỏ verify trong production để che lỗi trust.'],
        ['Lifecycle', 'Theo expiry và rotation', 'Renewal cần overlap, rollout và kiểm toàn bộ consumer trước khi thu hồi cert/key cũ.', 'find /etc -name "*.pem" -o -name "*.crt" 2>/dev/null\nopenssl x509 -checkend 1209600 -noout -in cert.pem', 'Inventory certificate phải có owner, issuer, expiry, consumer và rotation runbook.'],
        ['SSH CA', 'Đọc certificate/principal', 'SSH certificate ngắn hạn thay authorized_keys phân tán và có thể giới hạn principal.', 'ssh-keygen -L -f user-cert.pub\nsshd -T | grep -Ei "trustedusercakeys|authorizedprincipals|permitrootlogin|passwordauthentication"', 'Giữ một phiên dự phòng khi đổi SSH; test principal và CA trước khi đóng phiên cũ.'],
        ['PAM/Sudo', 'Review interactive privilege', 'PAM quyết định auth/session; sudoers quyết định command/target/run-as và log.', 'grep -R "^[^#]" /etc/pam.d 2>/dev/null\nsudo -l -U USER\nvisudo -c', 'Không sửa PAM/sudoers trực tiếp mà thiếu console/break-glass và syntax check.'],
        ['Workload', 'Bỏ cloud key dài hạn', 'ServiceAccount/workload identity đổi platform identity lấy token scope/TTL ngắn.', 'kubectl get sa -A\nkubectl get pods -A -o json | jq -r ".items[] | [.metadata.namespace,.metadata.name,.spec.serviceAccountName,.spec.automountServiceAccountToken] | @tsv"', 'Tắt automount nếu không cần; giới hạn audience, role và namespace.'],
        ['Secret', 'Kiểm lease, revoke và audit', 'Dynamic credential giảm cửa sổ lộ; audit phải cho biết ai đọc/cấp/revoke.', 'vault token lookup 2>/dev/null\nvault lease lookup LEASE_ID 2>/dev/null\nvault audit list 2>/dev/null\ngitleaks detect --no-git --redact 2>/dev/null', 'Không đưa secret vào command history/output; dùng lab token và redact bằng chứng.']
      ]
    },
    {
      id: 'networkdefense', title: 'Network Defense & Secure Edge', sub: 'nftables, segmentation, WAF, VPN', eyebrow: 'Master track · Network',
      h2: 'Network defense, secure edge và private administration',
      lead: 'Theo packet path thật, thiết kế zone và data-flow policy, bảo vệ origin, quản trị qua mạng riêng, kiểm soát abuse và tạo network evidence phục vụ incident.',
      refs: [['NIST CSF 2.0', 'https://www.nist.gov/cyberframework'], ['Kubernetes Network Policies', 'https://kubernetes.io/docs/concepts/services-networking/network-policies/']],
      rows: [
        ['Path', 'Theo route tới socket', 'Route, policy rule, interface, conntrack, NAT và listener phải khớp sơ đồ.', 'ip rule show\nip route get DESTINATION\nss -tulpen\nconntrack -L 2>/dev/null | head -100', 'Thay DESTINATION bằng IP lab; không thu toàn bộ conntrack nếu host quá tải.'],
        ['Firewall', 'Đọc nftables ruleset', 'Hook, priority, family, set và counter giúp biết packet bị xử lý ở đâu.', 'nft -a list ruleset\nnft list counters 2>/dev/null\nsysctl net.ipv4.ip_forward net.ipv6.conf.all.forwarding', 'Backup ruleset và giữ management session trước khi đổi default policy.'],
        ['Exposure', 'So sánh intended với observed', 'Listener local, firewall host, cloud rule và public scan phải cùng một kết quả.', 'ss -ltnup\ncurl -fsS https://api.ipify.org\nnmap -sT -sV -Pn OWNED_HOST', 'Chỉ scan tài sản được phép; kiểm cả IPv4 và IPv6.'],
        ['DNS', 'Kiểm authoritative path', 'A/AAAA/CNAME/CAA/NS và DNSSEC state ảnh hưởng traffic lẫn certificate issuance.', 'dig +trace DOMAIN\ndig +short A DOMAIN\ndig +short AAAA DOMAIN\ndig +short CAA DOMAIN\ndelv DOMAIN 2>/dev/null', 'Đổi DNS có TTL và rollback; không quên record IPv6/origin cũ.'],
        ['TLS', 'Đánh giá edge và origin', 'SNI, chain, protocol, redirect và origin authentication phải được kiểm riêng.', 'openssl s_client -connect DOMAIN:443 -servername DOMAIN </dev/null\ncurl -Ik https://DOMAIN\ncurl -Ik --resolve DOMAIN:443:ORIGIN_IP https://DOMAIN', 'Lệnh --resolve có thể bypass edge; chỉ dùng trên tài sản được phép và không chia sẻ origin.'],
        ['Abuse', 'Đo rate/latency/status', 'Rate limit cần biết identity/key, burst, upstream cost và false positive.', 'awk "{print \$9}" /var/log/nginx/access.log | sort | uniq -c | sort -nr | head\nawk "{print \$1}" /var/log/nginx/access.log | sort | uniq -c | sort -nr | head', 'Log format có thể khác; tránh công bố IP/user và dùng dữ liệu đã lọc.'],
        ['Packet', 'Capture có mục tiêu', 'Filter nhỏ theo host/port/time giúp trả lời giả thuyết và giảm dữ liệu nhạy cảm.', 'tcpdump -ni any host IP and port PORT -c 200 -w /tmp/case.pcap\nsha256sum /tmp/case.pcap', 'PCAP có thể chứa credential/data; giới hạn quyền, retention và chain-of-custody.'],
        ['Drift', 'Test flow matrix', 'Mỗi allow/deny quan trọng cần probe tự động từ đúng zone và alert khi đổi.', 'curl --connect-timeout 3 -fsS https://SERVICE/health\nnc -vz -w3 HOST PORT\nnft list ruleset | sha256sum', 'Probe deny phải fail đúng lý do; không coi timeout mọi loại là policy đúng.']
      ]
    },
    {
      id: 'secureplatform', title: 'Secure Platform Deployment', sub: 'HA, canary, migration, rollback', eyebrow: 'Master track · Platform',
      h2: 'Triển khai platform an toàn và không gián đoạn',
      lead: 'Kết nối SLO, failure domain, immutable release, database migration, progressive delivery, capacity và operational evidence thành một quy trình production có thể bảo vệ trước hội đồng kỹ thuật.',
      refs: [['NIST CSF 2.0', 'https://www.nist.gov/cyberframework'], ['Kubernetes Deployments', 'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/']],
      rows: [
        ['SLO', 'Chốt success criteria', 'Availability, latency, correctness, RPO/RTO và error budget quyết định release gate.', 'curl -fsS https://SERVICE/health\nvegeta attack -duration=30s -rate=20/s -targets=targets.txt | vegeta report 2>/dev/null', 'Load test trên staging/canary có giới hạn; không tạo tải production khi chưa được duyệt.'],
        ['Artifact', 'Chứng minh release bất biến', 'Commit, artifact digest, SBOM, config schema và runtime version phải truy ngược được.', 'git rev-parse HEAD\nsha256sum ARTIFACT\ndocker inspect IMAGE --format "{{index .RepoDigests 0}}" 2>/dev/null', 'Tag chỉ là nhãn; release record phải lưu digest.'],
        ['Capacity', 'Đọc headroom và saturation', 'Peak, burst, connection, queue, DB và dependency limit tạo capacity envelope.', 'uptime\nfree -h\nss -s\nps -eo pid,cmd,%cpu,%mem --sort=-%cpu | head\ndf -h', 'Đo theo workload thật; capacity plan phải có growth và failover condition.'],
        ['Migration', 'Kiểm compatibility', 'Expand/contract và backfill quan sát được cho phép version cũ/mới cùng chạy.', "git diff PREVIOUS..CURRENT -- migrations/\npsql -c \"select pid,state,wait_event_type,wait_event,query from pg_stat_activity where state <> 'idle';\" 2>/dev/null", 'Backup không thay migration rollback; test trên data shape gần production.'],
        ['Canary', 'So sánh revision', 'Error, latency, saturation và business correctness phải so canary với baseline.', 'kubectl rollout status deploy/APP -n NS\nkubectl get rs,pods -n NS -L version\nkubectl logs -n NS -l app=APP,version=canary --since=10m', 'Không promote chỉ vì pod Ready; dùng thời gian quan sát đủ dài.'],
        ['Rollback', 'Chứng minh đường quay lại', 'Artifact cũ, config, schema compatibility và traffic control phải được diễn tập.', 'kubectl rollout history deploy/APP -n NS\nkubectl rollout undo deploy/APP -n NS\nkubectl rollout status deploy/APP -n NS', 'Undo là thay đổi production; xác nhận revision và migration trước khi chạy.'],
        ['Backup', 'Gắn deploy với recoverability', 'Release/migration risk phải tham chiếu bản backup và restore drill gần nhất.', 'find /backup -type f -mtime -2 -ls 2>/dev/null\nsha256sum /backup/LATEST 2>/dev/null\nsystemctl list-timers --all | grep -i backup', 'Không coi file backup là bằng chứng restore; cần kết quả drill.'],
        ['Evidence', 'Tạo release record', 'Ai duyệt, risk, plan, artifact, metric, test, decision và rollback phải nằm cùng hồ sơ.', 'git log -1 --show-signature 2>/dev/null\nkubectl annotate deploy/APP -n NS change-ticket=TICKET --overwrite\nkubectl describe deploy/APP -n NS', 'Annotation không thay hệ thống change record; tránh ghi secret/PII.']
      ]
    },
    {
      id: 'supplychain', title: 'Software Supply Chain Security', sub: 'SLSA 1.2, SBOM, Sigstore, policy', eyebrow: 'Master track · Supply chain',
      h2: 'Bảo mật chuỗi cung ứng từ source tới production',
      lead: 'Bảo vệ source, dependency, runner, artifact, registry và deploy policy bằng SBOM, provenance SLSA 1.2, ký/xác minh Sigstore và identity CI ngắn hạn.',
      refs: [['SLSA specification 1.2', 'https://slsa.dev/spec/v1.2/'], ['Sigstore signing containers', 'https://docs.sigstore.dev/cosign/signing/signing_with_containers/'], ['Sigstore verifying signatures', 'https://docs.sigstore.dev/cosign/verifying/verify/']],
      rows: [
        ['Source', 'Bảo vệ workflow và branch', 'Review code vô nghĩa nếu workflow/build config có thể đổi không cần owner.', 'git log --show-signature -5\ngit diff -- .github/workflows .gitlab-ci.yml CODEOWNERS\ngh api repos/OWNER/REPO/branches/main/protection 2>/dev/null', 'API cần token read-only; không in token ra shell/log.'],
        ['Secret', 'Chặn credential trong source', 'Scan ở pre-commit và CI, nhưng lộ secret vẫn phải rotate chứ không chỉ xóa.', 'gitleaks detect --redact\ngit log -S "SECRET_NAME" --all --oneline', 'Không tìm bằng giá trị secret thật trong command history; dùng identifier hoặc fingerprint.'],
        ['Dependency', 'Pin và inventory đầu vào', 'Lockfile/digest, update process và dependency review giảm đổi ngoài ý muốn.', 'npm ci --ignore-scripts 2>/dev/null\nnpm audit --omit=dev 2>/dev/null\npip-audit 2>/dev/null\ngit diff -- "*lock*"', 'Audit finding phải đánh giá reachability/exposure; không auto-fix production mù.'],
        ['SBOM', 'Gắn component với digest', 'SBOM phải sinh từ artifact thật và lưu theo version/digest.', 'syft IMAGE -o cyclonedx-json=sbom.cdx.json\nsha256sum sbom.cdx.json\ntrivy image --format cyclonedx --output sbom-trivy.json IMAGE', 'Không đưa private registry credential vào output; bảo vệ SBOM nếu lộ topology/package nội bộ.'],
        ['Provenance', 'Kiểm build attestation', 'Verifier cần biết builder, source, parameters và subject digest theo SLSA 1.2.', 'cosign verify-attestation --type slsaprovenance --certificate-identity-regexp "^https://github.com/ORG/REPO/" --certificate-oidc-issuer https://token.actions.githubusercontent.com IMAGE', 'Pin identity/issuer cụ thể; regexp quá rộng làm policy vô nghĩa.'],
        ['Signing', 'Ký bằng CI identity ngắn hạn', 'Keyless signing liên kết ephemeral key với OIDC identity và transparency evidence.', 'cosign sign IMAGE\ncosign verify --certificate-identity IDENTITY --certificate-oidc-issuer ISSUER IMAGE\ncosign tree IMAGE', 'Dùng registry lab; verify identity và digest, không chỉ thấy “Verified OK”.'],
        ['Registry', 'Review artifact policy', 'Immutable digest, retention, quarantine và re-scan giữ registry thành control point.', 'crane digest IMAGE 2>/dev/null\nskopeo inspect docker://IMAGE 2>/dev/null | jq ".Digest,.Labels"\ntrivy image --severity HIGH,CRITICAL IMAGE', 'Rate limit và auth registry; không quét image không được phép.'],
        ['Admission', 'Chặn artifact không đạt', 'Policy phải verify source/builder/signature/provenance trước runtime và có break-glass hữu hạn.', 'kubectl get validatingadmissionpolicies,validatingwebhookconfigurations\nkubectl get clusterpolicy -A 2>/dev/null\nkubectl get events -A --sort-by=.lastTimestamp | tail -50', 'Break-glass cần approval, TTL, alert và post-review; test fail-closed/fail-open.']
      ]
    },
    {
      id: 'cloudk8ssecurity', title: 'Cloud & Kubernetes Runtime Security', sub: 'IAM, PSS, policy, runtime detection', eyebrow: 'Master track · Runtime',
      h2: 'Cloud và Kubernetes runtime security',
      lead: 'Tạo guardrail từ organization IAM tới cluster control plane, Pod Security Standards, admission policy, workload identity, network isolation và runtime response.',
      refs: [['Kubernetes Pod Security Standards', 'https://kubernetes.io/docs/concepts/security/pod-security-standards/'], ['Pod Security Admission', 'https://kubernetes.io/docs/concepts/security/pod-security-admission/'], ['Kubernetes security concepts', 'https://kubernetes.io/docs/concepts/security/']],
      rows: [
        ['IAM', 'Tìm quyền hiệu lực', 'User/role/group/binding và credential path phải được đọc theo principal thật.', 'kubectl auth can-i --list --as system:serviceaccount:NS:SA -n NS\nkubectl get clusterrolebindings,rolebindings -A -o wide\nkubectl get sa -A', 'Impersonation cần quyền; chỉ dùng trong cluster lab/được phép.'],
        ['API', 'Review exposure và audit', 'Endpoint, authentication, authorization, admission và audit tạo control plane path.', 'kubectl cluster-info\nkubectl get --raw=/readyz?verbose\nkubectl get apiservices\nkubectl get validatingwebhookconfigurations,mutatingwebhookconfigurations', 'Không công bố endpoint/kubeconfig; readyz chi tiết chỉ cho operator.'],
        ['PSS', 'Enforce Restricted có version', 'Namespace label enforce/audit/warn cho phép rollout policy có quan sát.', 'kubectl label ns NS pod-security.kubernetes.io/enforce=restricted pod-security.kubernetes.io/enforce-version=latest --overwrite\nkubectl get ns NS --show-labels', 'Bắt đầu audit/warn trên workload cũ; pin version khi quy trình yêu cầu ổn định.'],
        ['Context', 'Review workload privilege', 'Root, privilege escalation, capability, seccomp, host namespace/path và writable rootfs quyết định isolation.', 'kubectl get pods -A -o json | jq -r ".items[] | [.metadata.namespace,.metadata.name,.spec.hostNetwork,.spec.hostPID] | @tsv"\nkubectl get pod POD -n NS -o yaml | sed -n "/securityContext:/,/resources:/p"', 'Review cả init/ephemeral container; không sửa production bằng edit trực tiếp.'],
        ['Network', 'Kiểm default deny và DNS', 'Policy chỉ có tác dụng nếu CNI hỗ trợ và selector/namespace đúng.', 'kubectl get networkpolicy -A\nkubectl describe networkpolicy -n NS\nkubectl get endpointslices -n NS\nkubectl run netcheck -n NS --rm -it --restart=Never --image=curlimages/curl -- https://SERVICE', 'Pod test chỉ tạo trong namespace lab và xóa sau kiểm tra.'],
        ['Identity', 'Loại bỏ static cloud key', 'ServiceAccount phải map sang role scope hẹp và token có audience/TTL.', 'kubectl describe sa SA -n NS\nkubectl get pod POD -n NS -o jsonpath="{.spec.serviceAccountName}{\"\\n\"}{.spec.automountServiceAccountToken}{\"\\n\"}"\nkubectl create token SA -n NS --duration=10m --audience=LAB 2>/dev/null', 'Token command tạo credential thật; chỉ dùng lab, không log/chia sẻ output.'],
        ['Supply', 'Đối chiếu image digest', 'Runtime phải chạy đúng digest đã verify, không chỉ đúng tag.', 'kubectl get pods -A -o json | jq -r ".items[] | .status.containerStatuses[]? | [.name,.image,.imageID] | @tsv"\ncosign verify IMAGE_DIGEST 2>/dev/null', 'Identity/issuer verify phải cụ thể trong policy thật.'],
        ['Runtime', 'Nối event với workload', 'Unexpected exec, process, mount, egress và API action cần pod/image/identity context.', 'kubectl get events -A --sort-by=.lastTimestamp | tail -100\nkubectl logs -n RUNTIME_SECURITY -l app=falco --since=30m 2>/dev/null\nkubectl get events -A -o json > /tmp/k8s-events.json', 'Evidence chứa tên nội bộ; giới hạn quyền và retention.']
      ]
    },
    {
      id: 'forensics', title: 'Incident Forensics & Recovery', sub: 'Evidence, timeline, clean rebuild', eyebrow: 'Master track · Incident',
      h2: 'Incident forensics và phục hồi sạch',
      lead: 'Chuẩn bị evidence, thu volatile state, dựng timeline host/container/cloud, containment có kiểm soát, rebuild từ known-good và biến khoảng trống điều tra thành detection mới.',
      refs: [['NIST SP 800-61 Rev. 3', 'https://csrc.nist.gov/pubs/sp/800/61/r3/final'], ['NIST CSF 2.0', 'https://www.nist.gov/cyberframework']],
      rows: [
        ['Case', 'Mở case và chuẩn hóa giờ', 'Case ID, scope, UTC, collector, source và hash bảo vệ tính nhất quán.', 'date -u --iso-8601=seconds\ntimedatectl status\nhostnamectl\nuname -a', 'Không đổi timezone/clock trước khi ghi trạng thái ban đầu.'],
        ['Volatile', 'Chụp user, process và socket', 'Volatile state mất khi reboot; thứ tự lấy phụ thuộc safety và business impact.', 'w\nlast -Fai | head -50\nps -eo pid,ppid,user,lstart,stat,cmd --forest\nss -tpna\nlsof -nP | head -200', 'Output có dữ liệu nhạy cảm; lưu evidence store quyền hạn chế.'],
        ['Persistence', 'Review điểm khởi động', 'Systemd, cron, SSH, shell profile, loader và package script thường bị lạm dụng.', 'systemctl list-unit-files --state=enabled\nsystemctl list-timers --all\nfind /etc/systemd /etc/cron* /root/.ssh /home -xdev -type f -mtime -7 -ls 2>/dev/null\nfind /etc/ld.so.preload /etc/profile.d -type f -ls 2>/dev/null', 'mtime có thể bị giả; đối chiếu journal/audit/package/source.'],
        ['Files', 'Hash và metadata artifact', 'Hash, stat, owner, xattr và package provenance tạo evidence, không tự kết luận độc hại.', 'stat -c "%n|%s|%U:%G|%a|%w|%y|%z" FILE\nsha256sum FILE\ngetfattr -d -m- FILE 2>/dev/null\ndpkg -S FILE 2>/dev/null || rpm -qf FILE 2>/dev/null', 'Không thực thi file nghi ngờ; copy theo quy trình evidence.'],
        ['Timeline', 'Ghép journal, auth và audit', 'Dùng cùng UTC/case window và ghi clock skew/source lag.', 'journalctl --utc --since "START" --until "END" -o short-iso-precise\njournalctl --utc _UID=UID --since "START"\nausearch -ts START -te END -i 2>/dev/null', 'Export bản gốc trước khi lọc; không xóa/rotate log trong điều tra.'],
        ['Container', 'Lưu runtime context', 'Container ID, image digest, mounts, env name, namespace và node nối artifact với host.', 'docker inspect CONTAINER > /tmp/container-inspect.json 2>/dev/null\ndocker diff CONTAINER 2>/dev/null\ncrictl inspect CONTAINER > /tmp/cri-inspect.json 2>/dev/null\nsha256sum /tmp/*inspect.json 2>/dev/null', 'Inspect có thể chứa secret; redact bản báo cáo, giữ bản gốc bảo mật.'],
        ['Kubernetes', 'Thu object và control-plane event', 'Pod có thể biến mất; audit/event/log phải nằm ngoài workload.', 'kubectl get pod POD -n NS -o yaml > /tmp/pod.yaml\nkubectl describe pod POD -n NS > /tmp/pod.describe\nkubectl logs POD -n NS --all-containers --timestamps > /tmp/pod.log\nsha256sum /tmp/pod*', 'Không exec vào pod nghi ngờ nếu làm thay đổi state; ưu tiên API/log/snapshot.'],
        ['Recover', 'Xác minh known-good', 'Recovery gồm artifact provenance, secret mới, data integrity, monitoring và hunt sau restore.', 'cosign verify IMAGE_DIGEST 2>/dev/null\nsha256sum BACKUP\ngit verify-commit COMMIT 2>/dev/null\ncurl -fsS https://SERVICE/health', 'Không đưa host cũ trở lại chỉ vì đã xóa IOC; rebuild và theo dõi tăng cường.']
      ]
    },
    {
      id: 'systemrecovery', title: 'System Recovery Engineering', sub: 'Boot, storage, PITR, etcd, DR', eyebrow: 'Master track · Recovery',
      h2: 'Khôi phục hệ thống từ boot failure tới disaster recovery',
      lead: 'Biến backup thành năng lực phục hồi thật: triage không phá evidence, cứu boot/storage, dựng lại host sạch, phục hồi database/control plane nhất quán, chuyển traffic và failback trong RTO/RPO đo được.',
      refs: [['systemd special targets', 'https://www.freedesktop.org/software/systemd/man/latest/systemd.special.html'], ['PostgreSQL continuous archiving và PITR', 'https://www.postgresql.org/docs/current/continuous-archiving.html'], ['Kubernetes: operating etcd clusters', 'https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/'], ['NIST SP 800-34 Rev. 1', 'https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final']],
      rows: [
        ['Triage', 'Chốt failure domain và đường recovery', 'Impact, last-known-good, recovery point, dependency, integrity và thời gian quyết định repair/rebuild/failover.', 'date -u --iso-8601=seconds\nuptime\nlsblk -o NAME,TYPE,FSTYPE,SIZE,MOUNTPOINTS\nfindmnt\nsystemctl --failed\njournalctl -xb -p warning --no-pager', 'Ghi case/timeline trước thay đổi; không reboot hoặc repair mù khi evidence và state chưa được bảo vệ.'],
        ['Boot', 'Phân lớp early boot', 'UEFI/BIOS, bootloader, kernel, initramfs, root mount và systemd target có triệu chứng và đường rollback khác nhau.', 'cat /proc/cmdline\njournalctl --list-boots\njournalctl -b -1 -k --no-pager\nbootctl status 2>/dev/null || efibootmgr -v\nls -lah /boot', 'Giữ kernel/initramfs cũ và console out-of-band; test rescue trên VM snapshot trước production.'],
        ['Storage', 'Vẽ device chain', 'Disk, RAID, LUKS, LVM, filesystem và mount phải được nhận diện đúng thứ tự trước khi can thiệp.', 'lsblk -e7 -o NAME,KNAME,TYPE,FSTYPE,SIZE,RO,STATE,MOUNTPOINTS\nblkid\ncat /proc/mdstat\npvs; vgs; lvs -a -o +devices\ncryptsetup status MAPPER 2>/dev/null', 'Không initialize, format, pvcreate hoặc assemble cưỡng bức khi chưa có inventory và bản sao metadata.'],
        ['Hardware', 'Tách media lỗi khỏi filesystem lỗi', 'SMART/NVMe health, kernel IO error và controller path cho biết thiết bị có tiếp tục phá dữ liệu hay không.', 'smartctl -x /dev/DISK\nnvme smart-log /dev/NVME 2>/dev/null\njournalctl -k -b | grep -Ei "I/O error|medium error|reset|timeout|nvme|ata"', 'Nếu media đang suy giảm, giảm ghi và image/clone sang thiết bị tốt trước; không stress test ổ đang lỗi.'],
        ['Filesystem', 'Kiểm tra read-only trước repair', 'Tool và quy tắc khác nhau giữa ext4, XFS, Btrfs, ZFS; repair không thay data recovery.', 'findmnt -no SOURCE,FSTYPE,OPTIONS /MOUNT\nfsck -N /dev/VOLUME\ne2fsck -fn /dev/VOLUME\nxfs_repair -n /dev/VOLUME', 'Chỉ chạy checker phù hợp trên volume unmounted hoặc theo tài liệu filesystem; snapshot/image trước lệnh có ghi.'],
        ['Rescue OS', 'Mount, chroot và phục hồi cấu hình', 'Rescue environment phải mount đúng root/boot/EFI cùng pseudo-filesystem rồi mới sửa initramfs, bootloader, package hoặc fstab.', 'mount -o ro /dev/ROOT /mnt\ncat /mnt/etc/fstab\nchroot /mnt /bin/sh -c "systemctl --failed; systemctl get-default"\nrpm -Va 2>/dev/null || debsums -s 2>/dev/null', 'Bắt đầu read-only; remount ghi chỉ sau khi có backup và change plan. Không tái dùng host nếu integrity không chứng minh được.'],
        ['Database', 'Phục hồi tới điểm nhất quán', 'Base backup cộng WAL cho PITR; target time/LSN phải nằm trước corruption và phù hợp schema/application.', 'pg_verifybackup BACKUP_DIR\npg_controldata DATA_DIR\npg_waldump --start=LSN WAL_FILE | head\nsha256sum BACKUP_MANIFEST', 'Restore vào instance cô lập, đúng major version; bảo vệ WAL gốc và không mở traffic trước reconciliation.'],
        ['Backup', 'Kiểm restore độc lập với production', 'Integrity, key, retention, immutability và credential tách quyền phải được thử từ môi trường recovery.', 'restic snapshots\nrestic check --read-data-subset=5%\nrestic restore latest --target /restore-test\nfind /restore-test -xdev -type f | wc -l', 'Target phải là lab trống; không restore đè production. Kết quả cần data/app validation, không chỉ exit code 0.'],
        ['Control plane', 'Restore etcd có kiểm soát', 'Snapshot etcd chứa Kubernetes state, nhưng workload data, external secret và artifact nằm ở failure domain khác.', 'etcdutl snapshot status snapshot.db --write-out=table\nsha256sum snapshot.db\netcdutl snapshot restore snapshot.db --data-dir /var/lib/etcd-restore\nkubectl get --raw=/readyz?verbose', 'Restore trên control plane lab dừng và version tương thích; bảo vệ cert/key, revision và membership trước khi nối API server.'],
        ['Return', 'Validate, chuyển traffic và failback', 'Health kỹ thuật phải đi cùng synthetic transaction, data invariant, identity, telemetry, backup mới và rollback path.', 'dig +short SERVICE_DOMAIN\ncurl -fsS -w "%{http_code} %{time_total}\\n" https://SERVICE/health\nopenssl s_client -connect SERVICE:443 -servername SERVICE </dev/null 2>/dev/null | openssl x509 -noout -dates -issuer\nsha256sum RECOVERY_EVIDENCE/*', 'Canary traffic trước full cutover; failback là change riêng có approval, replication check và stop condition.']
      ]
    },
    {
      id: 'mastercapstone', title: 'Master Platform Defense', sub: 'Design, build, defend, recover', eyebrow: 'Master track · Capstone',
      h2: 'Master Capstone: thiết kế, triển khai và bảo vệ platform',
      lead: 'Bài tốt nghiệp không chấm số công cụ. Bài chấm khả năng biến requirement thành kiến trúc, chứng minh control bằng evidence, xử lý scenario mù và bàn giao hệ thống cho operator khác.',
      refs: [['NIST CSF 2.0', 'https://www.nist.gov/cyberframework'], ['NIST SP 800-61 Rev. 3', 'https://csrc.nist.gov/pubs/sp/800/61/r3/final'], ['NIST SP 800-34 Rev. 1', 'https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final'], ['SLSA 1.2', 'https://slsa.dev/spec/v1.2/'], ['Kubernetes PSS', 'https://kubernetes.io/docs/concepts/security/pod-security-standards/']],
      rows: [
        ['Architecture', 'Architecture and risk brief', 'C4/data flow, trust boundary, SLO, RPO/RTO, asset, threat, failure mode và residual risk.', 'test -s docs/architecture.md\ntest -s docs/threat-model.md\ntest -s docs/risk-register.md', 'Phải ghi trade-off và risk owner, không chỉ vẽ sơ đồ.'],
        ['IaC', 'Reproducible platform', 'Network, identity, compute, policy và data dependency được review bằng code/state an toàn.', 'terraform fmt -check -recursive\nterraform validate\nterraform plan -out=capstone.tfplan\ntrivy config .', 'Apply chỉ trong lab/account được phép; bảo vệ state và plan.'],
        ['Supply', 'Trusted artifact path', 'Source protection, SBOM, provenance, signature, immutable registry và admission verification.', 'gitleaks detect --redact\nsyft IMAGE -o cyclonedx-json=sbom.json\ncosign verify IMAGE_DIGEST\ncosign verify-attestation --type slsaprovenance IMAGE_DIGEST', 'Verifier phải pin identity/issuer và digest.'],
        ['Platform', 'Hardened runtime', 'Private admin, least privilege, PSS Restricted, NetworkPolicy, workload identity và resource boundary.', 'kubectl auth can-i --list --as system:serviceaccount:NS:SA -n NS\nkubectl get ns NS --show-labels\nkubectl get networkpolicy -n NS\nsystemd-analyze security SERVICE 2>/dev/null', 'Exception cần risk acceptance, TTL và compensating control.'],
        ['Recovery', 'Measured total-loss recovery', 'Clean-host rebuild, database PITR, etcd restore, traffic cutover và failback phải có RTO/RPO cùng data validation.', 'test -s docs/runbooks/system-recovery.md\ntest -s docs/recovery/rto-rpo.csv\ntest -s docs/recovery/data-reconciliation.md\ntest -s docs/recovery/failback.md', 'Total-loss drill chỉ chạy trong môi trường capstone tách biệt, có stop condition và owner.'],
        ['Detection', 'Actionable security telemetry', 'Identity, edge, host, K8s, cloud và app log nối được cùng request/case.', 'test -s docs/alerts.md\ntest -s docs/runbooks/incident.md\ntest -s docs/evidence-map.md', 'Alert phải có owner, severity, evidence và false-positive notes.'],
        ['Game day', 'Blind scenario response', 'Availability, security và data scenario được người khác inject; đo MTTD/MTTR và decision.', 'test -s docs/incidents/timeline.md\ntest -s docs/incidents/evidence.sha256\ntest -s docs/incidents/rca.md', 'Không xem trước scenario; phân biệt fact, inference và unknown.'],
        ['Defense', 'Technical defense and handover', 'Giải thích trade-off, known risk, control evidence và để operator khác deploy/restore theo runbook.', 'test -s docs/handover.md\ntest -s docs/runbooks/deploy.md\ntest -s docs/runbooks/rollback.md\ntest -s docs/runbooks/restore.md', 'Mastery cần người khác thực hiện thành công, không chỉ tác giả hiểu.']
      ]
    }
  ];

  const pathEscape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  const pathTitle = (moduleId) => moduleTabs.find((tab) => tab.dataset.module === moduleId)?.querySelector('strong')?.textContent?.trim() || moduleId;
  const pathPhaseFor = (moduleId) => pathPhases.find((phase) => phase.modules.includes(moduleId));
  const pathDoneKey = (moduleId) => `learnit:path:done:${moduleId}`;
  const pathIsDone = (moduleId) => localStorage.getItem(pathDoneKey(moduleId)) === '1';
  const pathIsReference = (moduleId) => pathPhaseFor(moduleId)?.id === 'reference';

  const pathMetaFor = (moduleId) => {
    const course = pathCatalog[moduleId];
    const support = pathSupportMeta[moduleId] || ['Tự học', 'Theo lộ trình liên quan', `Hoàn thành nội dung và áp dụng được ${pathTitle(moduleId)} trong một tình huống thực tế.`];
    return {
      duration: course?.duration || support[0],
      prerequisite: course?.prerequisite || support[1],
      outcome: course?.outcome || support[2]
    };
  };

  const pathMasterRowMarkup = (row, index) => `<tr data-tags="${pathEscape(row.join(' ').toLowerCase())}">
    <td><span class="row-index">${String(index + 1).padStart(2, '0')}</span><strong>${pathEscape(row[0])}</strong></td>
    <td>${pathEscape(row[1])}</td>
    <td>${pathEscape(row[2])}</td>
    <td><pre><code>${pathEscape(row[3])}</code></pre></td>
    <td>${pathEscape(row[4])}</td>
  </tr>`;

  const pathMasterPanelMarkup = (item) => `<article class="module-panel master-depth-panel" data-panel="${pathEscape(item.id)}">
    <p class="eyebrow">${pathEscape(item.eyebrow)}</p>
    <h2>${pathEscape(item.h2)}</h2>
    <p class="lead">${pathEscape(item.lead)}</p>
    <div class="deep-suite"></div>
    <section class="master-depth-handbook">
      <div class="handbook-head"><p class="eyebrow">Operational depth</p><h3>Bảng kiến thức và bằng chứng vận hành</h3><p>Mỗi dòng nối bản chất kỹ thuật với lệnh kiểm tra và điều kiện sử dụng an toàn. Thay placeholder bằng target lab của bạn trước khi chạy.</p></div>
      <div class="master-table-wrap"><table class="master-table master-depth-table"><thead><tr><th>Lớp</th><th>Năng lực</th><th>Bản chất phải hiểu</th><th>Lệnh kiểm tra trong lab</th><th>Evidence / Guardrail</th></tr></thead><tbody>${item.rows.map(pathMasterRowMarkup).join('')}</tbody></table></div>
    </section>
    <section class="master-standards"><p class="eyebrow">Primary references</p><h3>Nguồn chuẩn chính thức</h3><div>${item.refs.map((ref) => `<a href="${pathEscape(ref[1])}" target="_blank" rel="noreferrer">${pathEscape(ref[0])}</a>`).join('')}</div></section>
  </article>`;

  const pathInstallMasterModules = () => {
    if (!moduleNav || !moduleStage) return;
    pathMasterModules.forEach((item) => {
      if (moduleTabs.some((tab) => tab.dataset.module === item.id)) return;
      const tab = document.createElement('button');
      tab.className = 'module-tab master-depth-tab';
      tab.type = 'button';
      tab.dataset.module = item.id;
      tab.innerHTML = `<span>M</span><strong>${pathEscape(item.title)}</strong><small>${pathEscape(item.sub)}</small>`;
      tab.addEventListener('click', () => activateModule(item.id));
      moduleTabs.push(tab);
      moduleNav.append(tab);
      moduleStage.insertAdjacentHTML('beforeend', pathMasterPanelMarkup(item));
      const panel = moduleStage.querySelector(`[data-panel="${item.id}"]`);
      if (panel) modulePanels.push(panel);
    });
    enhanceRows();
    installLearningStatus();
  };

  const pathOpenModule = (moduleId) => {
    const tab = moduleTabs.find((item) => item.dataset.module === moduleId);
    tab?.closest('details')?.setAttribute('open', '');
    activateModule(moduleId);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${encodeURIComponent(moduleId)}`);
    if (window.matchMedia('(max-width: 820px)').matches) document.querySelector('.module-rail')?.classList.remove('is-mobile-open');
    if (moduleId === 'roadmap') pathRenderRoadmapLookup();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pathBuildRoadmap = () => {
    if (!moduleNav || !moduleStage || document.querySelector('[data-module="roadmap"]')) return;
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'module-tab curriculum-home-tab';
    tab.dataset.module = 'roadmap';
    tab.innerHTML = '<span>START</span><strong>Lộ trình học</strong><small>Bắt đầu và tiếp tục đúng thứ tự</small>';
    tab.addEventListener('click', () => pathOpenModule('roadmap'));
    moduleTabs.unshift(tab);

    const panel = document.createElement('article');
    panel.className = 'module-panel path-roadmap-panel';
    panel.dataset.panel = 'roadmap';
    moduleStage.prepend(panel);
    modulePanels.unshift(panel);
    pathRenderRoadmap();
  };

  const pathRoadmapPhaseMarkup = (phase) => {
    const links = phase.modules.map((moduleId) => `<button type="button" class="path-module-link${pathIsDone(moduleId) ? ' is-done' : ''}" data-path-open="${pathEscape(moduleId)}">${pathEscape(pathTitle(moduleId))}</button>`).join('');
    return `<section class="path-phase-card">
      <div class="path-phase-no">${pathEscape(phase.no)}</div>
      <div class="path-phase-summary"><h3>${pathEscape(phase.title)}</h3><p>${pathEscape(phase.summary)}</p><small>${pathEscape(phase.weeks)}</small></div>
      <div><div class="path-module-links">${links}</div><p class="path-progress-copy"><strong>Đầu ra:</strong> ${pathEscape(phase.deliverable)}</p></div>
    </section>`;
  };

  function pathRenderRoadmap() {
    const panel = modulePanels.find((item) => item.dataset.panel === 'roadmap');
    if (!panel) return;
    const done = pathCoreOrder.filter(pathIsDone).length;
    const nextId = pathCoreOrder.find((moduleId) => !pathIsDone(moduleId)) || 'finalquiz';
    const pct = Math.round(done / pathCoreOrder.length * 100);
    panel.innerHTML = `
      <header class="path-roadmap-head">
        <div><p class="eyebrow">DevOps · DevSecOps · System Security</p><h2>Master triển khai, bảo mật và khôi phục hệ thống production</h2><p class="lead">Đường chính gồm ${pathCoreOrder.length} chặng từ Linux tới platform defense. Trọng tâm là triển khai có thể rollback, hardening có evidence, phát hiện sự cố và khôi phục toàn hệ thống trong RTO/RPO đo được.</p></div>
        <aside class="path-resume"><small>Tiến độ đường chính</small><strong>${done}/${pathCoreOrder.length} chặng · ${pct}%</strong><div class="path-progress-track"><span style="width:${pct}%"></span></div><button type="button" data-path-open="${pathEscape(nextId)}">${done ? 'Tiếp tục' : 'Bắt đầu'}: ${pathEscape(pathTitle(nextId))}</button></aside>
      </header>
      <section class="path-orientation" aria-label="Nguyên tắc học">
        <div><span>01</span><strong>Deployment Engineering</strong><small>Immutable release, HA, migration, canary, rollback, capacity và disaster recovery.</small></div>
        <div><span>02</span><strong>System Security</strong><small>Host internals, identity/PKI, network defense, supply chain và runtime isolation.</small></div>
        <div><span>03</span><strong>Incident & Recovery</strong><small>Evidence, boot/storage rescue, clean rebuild, PITR, control-plane restore, failover và failback.</small></div>
        <div><span>04</span><strong>Evidence-based Mastery</strong><small>Không đạt chỉ vì đọc xong; phải build, break, defend, restore và bảo vệ trade-off.</small></div>
      </section>
      <div class="path-section-head"><h3>Lộ trình 40 tuần</h3><p>Mỗi phase kết thúc bằng một đầu ra có thể chạy, kiểm tra hoặc bàn giao. Kho tra cứu nằm ngoài lịch học và chỉ mở khi lab cần.</p></div>
      <div class="path-phase-list">${pathPhases.map(pathRoadmapPhaseMarkup).join('')}</div>
      <div class="path-section-head"><h3>Rubric năng lực</h3><p>Chỉ gọi là Master khi đạt Level 5 ở capstone, không có critical gap chưa có owner và người khác vận hành được hệ thống đã bàn giao.</p></div>
      <section class="mastery-rubric">
        <div><span>L1</span><strong>Explain</strong><small>Giải thích đúng bản chất, trust boundary, failure mode và rủi ro.</small></div>
        <div><span>L2</span><strong>Build</strong><small>Tự triển khai bằng code, có test và đầu ra tái lập được.</small></div>
        <div><span>L3</span><strong>Troubleshoot</strong><small>Khoanh vùng scenario mù bằng evidence, không sửa ngẫu nhiên.</small></div>
        <div><span>L4</span><strong>Defend & Recover</strong><small>Ngăn, phát hiện, containment và phục hồi sạch trong RTO/RPO.</small></div>
        <div><span>L5</span><strong>Design & Lead</strong><small>Bảo vệ trade-off, chấp nhận residual risk và bàn giao cho operator khác.</small></div>
      </section>
      <div class="path-section-head"><h3>Cách hoàn thành một bài</h3><p>Nhịp học này giữ phần lý thuyết gắn với thao tác thật và tránh học thuộc lệnh rời rạc.</p></div>
      <section class="path-method">
        <article><span>01 · HIỂU</span><h4>Đọc bản chất</h4><p>Biết đầu vào, luồng xử lý, đầu ra và dấu hiệu khi thành phần hỏng.</p></article>
        <article><span>02 · LÀM</span><h4>Hoàn thành lab</h4><p>Tự dựng, chạy lệnh và lưu output thay vì chỉ copy câu lệnh.</p></article>
        <article><span>03 · PHÁ</span><h4>Tạo lỗi có chủ đích</h4><p>Quan sát triệu chứng, tự khoanh vùng rồi phục hồi bằng bằng chứng.</p></article>
        <article><span>04 · CHỨNG MINH</span><h4>Nộp đầu ra</h4><p>Verify, ghi runbook/RCA và giải thích được quyết định của mình.</p></article>
      </section>`;
    panel.querySelectorAll('[data-path-open]').forEach((button) => button.addEventListener('click', () => pathOpenModule(button.dataset.pathOpen)));
  }

  const pathOrganizeNavigation = () => {
    if (!moduleNav || moduleNav.dataset.pathReady) return;
    moduleNav.dataset.pathReady = '1';
    const roadmapTab = moduleTabs.find((tab) => tab.dataset.module === 'roadmap');
    moduleNav.replaceChildren();
    if (roadmapTab) moduleNav.append(roadmapTab);
    pathPhases.forEach((phase) => {
      const details = document.createElement('details');
      details.className = 'path-group';
      details.dataset.pathGroup = phase.id;
      details.open = phase.id === 'foundation';
      details.innerHTML = `<summary><span class="path-group-index">${pathEscape(phase.no)}</span><span class="path-group-title"><strong>${pathEscape(phase.title)}</strong><small>${pathEscape(phase.weeks)}</small></span></summary><div class="path-group-tabs"></div>`;
      const host = details.querySelector('.path-group-tabs');
      phase.modules.forEach((moduleId, index) => {
        const tab = moduleTabs.find((item) => item.dataset.module === moduleId);
        if (!tab) return;
        const no = tab.querySelector('span');
        if (no) no.textContent = phase.no === 'REF' ? `R${index + 1}` : `${phase.no}.${index + 1}`;
        host.append(tab);
      });
      moduleNav.append(details);
    });
    const leftovers = moduleTabs.filter((tab) => tab.dataset.module !== 'roadmap' && !tab.closest('.path-group'));
    if (leftovers.length) {
      const host = moduleNav.querySelector('[data-path-group="reference"] .path-group-tabs');
      leftovers.forEach((tab) => host?.append(tab));
    }
    const rail = moduleNav.closest('.module-rail');
    if (rail && !rail.querySelector('.path-mobile-toggle')) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'path-mobile-toggle';
      toggle.textContent = 'Mở danh sách chương';
      toggle.addEventListener('click', () => {
        const open = rail.classList.toggle('is-mobile-open');
        toggle.textContent = open ? 'Đóng danh sách chương' : 'Mở danh sách chương';
      });
      moduleNav.before(toggle);
      moduleTabs.forEach((tab) => tab.addEventListener('click', () => {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${encodeURIComponent(tab.dataset.module)}`);
        if (!window.matchMedia('(max-width: 820px)').matches) return;
        rail.classList.remove('is-mobile-open');
        toggle.textContent = 'Mở danh sách chương';
      }));
    }
    new MutationObserver(() => {
      moduleNav.querySelector('.module-tab.active')?.closest('details')?.setAttribute('open', '');
    }).observe(moduleNav, { subtree: true, attributes: true, attributeFilter: ['class'] });
  };

  const pathCourseSuiteMarkup = (moduleId, course) => {
    const chapters = course.chapters.map((chapter, index) => `<article class="chapter-card"><p class="eyebrow">Bài ${String(index + 1).padStart(2, '0')}</p><div><h4>${pathEscape(chapter[0])}</h4><p>${pathEscape(chapter[1])}</p></div><ul>${chapter[2].map((item) => `<li>${pathEscape(item)}</li>`).join('')}</ul></article>`).join('');
    const checks = course.checks.map((check, index) => `<article class="path-check-item"><h4>${String(index + 1).padStart(2, '0')}. ${pathEscape(check[0])}</h4><button type="button" class="path-answer-toggle">Xem đáp án</button><p class="path-check-answer">${pathEscape(check[1])}</p></article>`).join('');
    return `<div class="suite-tabs">
      <button type="button" class="suite-tab active" data-suite="chapter">Bài học</button>
      <button type="button" class="suite-tab" data-suite="lab">Bài lab</button>
      <button type="button" class="suite-tab" data-suite="check">Tự kiểm tra</button>
      <button type="button" class="suite-tab" data-suite="case">Tình huống</button>
    </div>
    <section class="suite-panel active" data-suite-panel="chapter"><div class="chapter-list">${chapters}</div></section>
    <section class="suite-panel" data-suite-panel="lab"><div class="path-lab-layout"><article class="path-lab-main"><p class="eyebrow">Hands-on lab</p><h4>${pathEscape(course.lab[0])}</h4><p>${pathEscape(course.lab[1])}</p><ol>${course.lab[2].map((step) => `<li>${pathEscape(step)}</li>`).join('')}</ol><textarea class="path-lab-note" placeholder="Ghi lệnh đã chạy, output quan trọng, lỗi gặp và cách sửa..."></textarea><div class="path-lab-actions"><button type="button" class="path-lab-save">Lưu ghi chú</button><button type="button" class="path-lab-finish">Đã kiểm chứng lab</button></div><p class="path-lab-state"></p></article><aside class="path-lab-proof"><p class="eyebrow">Definition of done</p><h4>Chỉ hoàn thành khi</h4><ul>${course.lab[3].map((proof) => `<li>${pathEscape(proof)}</li>`).join('')}</ul></aside></div></section>
    <section class="suite-panel" data-suite-panel="check"><div class="path-check-list">${checks}</div></section>
    <section class="suite-panel" data-suite-panel="case"><div class="path-case-layout"><article class="path-case-main"><p class="eyebrow">Production case</p><h4>${pathEscape(course.incident[0])}</h4><p>${pathEscape(course.incident[1])}</p></article><article class="path-case-response"><p class="eyebrow">Response order</p><h4>Thứ tự xử lý</h4><ol>${course.incident[2].map((step) => `<li>${pathEscape(step)}</li>`).join('')}</ol></article></div></section>`;
  };

  const pathBindCourseSuite = (moduleId, suite) => {
    suite.querySelectorAll('.suite-tab').forEach((tab) => tab.addEventListener('click', () => {
      suite.querySelectorAll('.suite-tab').forEach((item) => item.classList.toggle('active', item === tab));
      suite.querySelectorAll('.suite-panel').forEach((item) => item.classList.toggle('active', item.dataset.suitePanel === tab.dataset.suite));
    }));
    suite.querySelectorAll('.path-answer-toggle').forEach((button) => {
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', `answer-${moduleId}-${Math.random().toString(36).slice(2, 8)}`);
      const answer = button.nextElementSibling;
      if (answer) answer.id = button.getAttribute('aria-controls');
    });
    const noteKey = `learnit:path:lab-note:${moduleId}`;
    const stateKey = `learnit:path:lab-state:${moduleId}`;
    const note = suite.querySelector('.path-lab-note');
    const state = suite.querySelector('.path-lab-state');
    if (note) note.value = localStorage.getItem(noteKey) || '';
    if (state) state.textContent = localStorage.getItem(stateKey) || 'Trạng thái: Chưa kiểm chứng';
    suite.querySelector('.path-lab-save')?.addEventListener('click', () => {
      localStorage.setItem(noteKey, note?.value || '');
      if (state) state.textContent = 'Trạng thái: Đã lưu ghi chú lab';
      localStorage.setItem(stateKey, state?.textContent || '');
      showToast('Đã lưu ghi chú lab.');
    });
    suite.querySelector('.path-lab-finish')?.addEventListener('click', () => {
      localStorage.setItem(noteKey, note?.value || '');
      localStorage.setItem(stateKey, 'Trạng thái: Lab đã được kiểm chứng');
      if (state) state.textContent = 'Trạng thái: Lab đã được kiểm chứng';
      showToast('Đã ghi nhận kết quả lab.');
    });
  };

  const pathAddCourseMeta = (panel) => {
    const moduleId = panel.dataset.panel;
    if (!moduleId || moduleId === 'roadmap' || panel.querySelector('.module-course-meta')) return;
    const meta = pathMetaFor(moduleId);
    const phase = pathPhaseFor(moduleId);
    const core = pathCoreOrder.includes(moduleId);
    const block = document.createElement('section');
    block.className = 'module-course-meta';
    block.innerHTML = `<div class="meta-outcome"><small>Đầu ra phải đạt</small><strong>${pathEscape(meta.outcome)}</strong></div><div><small>Giai đoạn</small><strong>${pathEscape(phase?.title || 'Bổ trợ')}</strong></div><div><small>Thời lượng</small><strong>${pathEscape(meta.duration)}</strong></div><div><small>Học trước</small><strong>${pathEscape(meta.prerequisite)}</strong></div>${core ? '<button type="button" class="module-complete">Đánh dấu hoàn thành</button>' : ''}`;
    const anchor = panel.querySelector('.lead') || panel.querySelector('h2');
    anchor?.insertAdjacentElement('afterend', block);
    const complete = block.querySelector('.module-complete');
    const paint = () => {
      if (!complete) return;
      const done = pathIsDone(moduleId);
      complete.classList.toggle('is-done', done);
      complete.textContent = done ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành';
    };
    complete?.addEventListener('click', () => {
      localStorage.setItem(pathDoneKey(moduleId), pathIsDone(moduleId) ? '0' : '1');
      paint();
      pathRenderRoadmap();
    });
    paint();
  };

  const pathBuildToc = (panel) => {
    const moduleId = panel.dataset.panel;
    if (!moduleId || moduleId === 'roadmap' || moduleId === 'finalquiz') return;
    panel.querySelector('.module-toc')?.remove();
    const targets = [];
    const suite = panel.querySelector('.deep-suite');
    if (suite) {
      targets.push(['Bài học', suite.querySelector('[data-suite-panel="chapter"]'), 'chapter']);
      targets.push(['Bài lab', suite.querySelector('[data-suite-panel="lab"]'), 'lab']);
      targets.push(['Tự kiểm tra', suite.querySelector('[data-suite-panel="check"]'), 'check']);
    }
    const table = panel.querySelector('.master-table-wrap, .linux-table-wrap, .command-list, .lesson-grid, .command-pack');
    if (table) targets.push(['Tài liệu chi tiết', table, '']);
    if (!targets.length) return;
    const toc = document.createElement('nav');
    toc.className = 'module-toc';
    toc.innerHTML = `<div><span class="eyebrow">Course map</span><strong>${pathEscape(pathTitle(moduleId))}</strong></div><div class="module-toc-actions"></div>`;
    const actions = toc.querySelector('.module-toc-actions');
    targets.filter((target) => target[1]).forEach(([label, target, suiteName]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => {
        if (suiteName) suite?.querySelector(`[data-suite="${suiteName}"]`)?.click();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      actions.append(button);
    });
    panel.querySelector('.module-course-meta')?.insertAdjacentElement('afterend', toc);
  };

  const pathAddSequenceNav = (panel) => {
    const moduleId = panel.dataset.panel;
    const index = pathCoreOrder.indexOf(moduleId);
    if (index < 0 || panel.querySelector('.module-sequence-nav')) return;
    const previousId = pathCoreOrder[index - 1] || 'roadmap';
    const nextId = pathCoreOrder[index + 1] || 'roadmap';
    const nav = document.createElement('nav');
    nav.className = 'module-sequence-nav';
    nav.innerHTML = `<button type="button" data-path-open="${pathEscape(previousId)}">Trước: ${pathEscape(pathTitle(previousId))}</button><span>Chặng ${index + 1}/${pathCoreOrder.length}</span><button type="button" data-path-open="${pathEscape(nextId)}">Tiếp: ${pathEscape(pathTitle(nextId))}</button>`;
    nav.querySelectorAll('[data-path-open]').forEach((button) => button.addEventListener('click', () => pathOpenModule(button.dataset.pathOpen)));
    panel.append(nav);
  };

  const pathUpgradeModules = () => {
    document.querySelector('.ai-tutor-float')?.remove();
    modulePanels.forEach((panel) => {
      const moduleId = panel.dataset.panel;
      if (!moduleId || moduleId === 'roadmap') return;
      const suite = panel.querySelector('.deep-suite');
      const course = pathCatalog[moduleId];
      if (course && suite) {
        panel.classList.add('path-upgraded');
        suite.innerHTML = pathCourseSuiteMarkup(moduleId, course);
        pathBindCourseSuite(moduleId, suite);
      } else if (suite) {
        suite.remove();
        if (pathIsReference(moduleId)) {
          const note = document.createElement('p');
          note.className = 'path-reference-note';
          note.textContent = 'Đây là kho tra cứu theo tình huống, không phải một bài học cần đọc tuần tự. Hãy mở đúng mục khi bài lab hoặc sự cố yêu cầu.';
          (panel.querySelector('.lead') || panel.querySelector('h2'))?.insertAdjacentElement('afterend', note);
        }
      }
      pathAddCourseMeta(panel);
      pathBuildToc(panel);
      pathAddSequenceNav(panel);
    });
  };

  function pathRenderRoadmapLookup() {
    if (!lookupList) return;
    lookupList.innerHTML = pathPhases.map((phase) => `<button type="button" class="lookup-item" data-path-group-jump="${pathEscape(phase.id)}"><span>${pathEscape(phase.no)}</span><strong>${pathEscape(phase.title)}</strong><small>${pathEscape(phase.weeks)}</small></button>`).join('');
    lookupList.querySelectorAll('[data-path-group-jump]').forEach((button) => button.addEventListener('click', () => {
      document.querySelector('.path-phase-list')?.children[[...pathPhases].findIndex((phase) => phase.id === button.dataset.pathGroupJump)]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
  }

  pathInstallMasterModules();
  pathBuildRoadmap();
  pathOrganizeNavigation();
  pathUpgradeModules();
  pathRenderRoadmap();

  const saved = localStorage.getItem('learnit:active-module');
  const requested = decodeURIComponent(window.location.hash.slice(1));
  const firstVisitKey = 'learnit:path:v2-seen';
  if (requested && moduleTabs.some((tab) => tab.dataset.module === requested)) {
    pathOpenModule(requested);
  } else if (!localStorage.getItem(firstVisitKey)) {
    localStorage.setItem(firstVisitKey, '1');
    pathOpenModule('roadmap');
  } else if (saved && moduleTabs.some((tab) => tab.dataset.module === saved)) {
    moduleTabs.find((tab) => tab.dataset.module === saved)?.closest('details')?.setAttribute('open', '');
  }
})();
