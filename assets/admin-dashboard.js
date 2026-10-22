"use strict";

const isLocalHost = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
if (isLocalHost && window.location.port && window.location.port !== "8787") {
  const target = `${window.location.protocol}//${window.location.hostname}:8787/admin`;
  window.location.replace(target);
}

const note = document.getElementById("admin-dashboard-note");
const tableBody = document.getElementById("admin-leads-body");
const refreshButton = document.getElementById("admin-refresh-btn");
const exportButton = document.getElementById("admin-export-btn");
const logoutButton = document.getElementById("admin-logout-btn");
const filterForm = document.getElementById("admin-filter-form");
const filterEmail = document.getElementById("admin-filter-email");
const filterPhone = document.getElementById("admin-filter-phone");
const filterStatus = document.getElementById("admin-filter-status");
const filterDateFrom = document.getElementById("admin-filter-date-from");
const filterDateTo = document.getElementById("admin-filter-date-to");
const filterClear = document.getElementById("admin-filter-clear");
const statTotal = document.getElementById("admin-stat-total");
const statNew = document.getElementById("admin-stat-new");
const statProcessed = document.getElementById("admin-stat-processed");
const navItems = Array.from(document.querySelectorAll("[data-admin-view]"));
const viewPanels = Array.from(document.querySelectorAll("[data-admin-view-panel]"));
const healthButton = document.getElementById("admin-health-check-btn");
const publicStatus = document.getElementById("admin-public-status");
const apiStatus = document.getElementById("admin-api-status");
const maintenanceNote = document.getElementById("admin-maintenance-note");
const maintenanceToggle = document.getElementById("admin-maintenance-toggle");
const maintenanceState = document.getElementById("admin-maintenance-state");
const maintenanceToggleNote = document.getElementById("admin-maintenance-toggle-note");
const maintenanceMediaForm = document.getElementById("admin-maintenance-media-form");
const maintenanceLogoUrl = document.getElementById("admin-maintenance-logo-url");
const maintenanceYoutubeUrl = document.getElementById("admin-maintenance-youtube-url");
const maintenanceSoundcloudUrl = document.getElementById("admin-maintenance-soundcloud-url");
const maintenanceFacebookUrl = document.getElementById("admin-maintenance-facebook-url");
const maintenanceImageFile = document.getElementById("admin-maintenance-image-file");
const maintenanceImageName = document.getElementById("admin-maintenance-image-name");
const maintenanceMediaPreview = document.getElementById("admin-maintenance-media-preview");
const maintenanceMediaNote = document.getElementById("admin-maintenance-media-note");
const maintenanceImageRemove = document.getElementById("admin-maintenance-image-remove");
const maxMaintenanceImageTotalBytes = 100 * 1024 * 1024;
const allowedMaintenanceMediaTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/ogg",
]);

const state = {
  filters: {
    email: "",
    phone: "",
    status: "all",
    dateFrom: "",
    dateTo: "",
  },
  leads: [],
  maintenanceImageDataUrls: [],
  maintenanceImageUrls: [],
};

const setNote = (message, isError = false) => {
  if (!note) {
    return;
  }
  note.textContent = message;
  note.classList.toggle("admin-note-error", Boolean(isError));
};

const setMaintenanceNote = (message, isError = false) => {
  if (!maintenanceNote) {
    return;
  }
  maintenanceNote.textContent = message;
  maintenanceNote.classList.toggle("admin-note-error", Boolean(isError));
};

const setMaintenanceToggleNote = (message, isError = false) => {
  if (!maintenanceToggleNote) {
    return;
  }
  maintenanceToggleNote.textContent = message;
  maintenanceToggleNote.classList.toggle("admin-note-error", Boolean(isError));
};

const setMaintenanceMediaNote = (message, isError = false) => {
  if (!maintenanceMediaNote) {
    return;
  }
  maintenanceMediaNote.textContent = message;
  maintenanceMediaNote.classList.toggle("admin-note-error", Boolean(isError));
};

const setInputValue = (input, value) => {
  if (input) {
    input.value = String(value || "");
  }
};

const getMediaTypeFromUrl = (value) => {
  const url = String(value && value.url ? value.url : value || "").split("?")[0].toLowerCase();
  if (String(value && value.type ? value.type : "") === "video" || /\.(mp4|webm|ogg)$/.test(url) || url.startsWith("data:video/")) {
    return "video";
  }
  return "image";
};

const normalizePreviewItems = (items = []) => (Array.isArray(items) ? items : [items])
  .map((item) => {
    if (item && typeof item === "object") {
      return {
        url: String(item.url || "").trim(),
        type: item.type === "video" ? "video" : getMediaTypeFromUrl(item.url),
      };
    }
    const url = String(item || "").trim();
    return { url, type: getMediaTypeFromUrl(url) };
  })
  .filter((item) => item.url);

const renderMaintenancePreview = (imageUrls = []) => {
  if (!maintenanceMediaPreview) {
    return;
  }
  const items = normalizePreviewItems(imageUrls);
  maintenanceMediaPreview.replaceChildren();
  maintenanceMediaPreview.hidden = items.length === 0;
  if (items.length === 0) {
    return;
  }
  for (const [index, item] of items.entries()) {
    if (item.type === "video") {
      const video = document.createElement("video");
      video.src = item.url;
      video.controls = true;
      video.muted = true;
      video.playsInline = true;
      video.title = `Video hiển thị trên trang bảo trì ${index + 1}`;
      maintenanceMediaPreview.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = item.url;
      img.alt = `Ảnh hiển thị trên trang bảo trì ${index + 1}`;
      maintenanceMediaPreview.appendChild(img);
    }
  }
};

const renderMaintenanceState = (enabled) => {
  if (maintenanceToggle) {
    maintenanceToggle.checked = Boolean(enabled);
  }
  if (maintenanceState) {
    maintenanceState.textContent = enabled ? "Trạng thái: Kích hoạt" : "Trạng thái: Đóng";
    maintenanceState.classList.toggle("admin-health-ok", Boolean(enabled));
    maintenanceState.classList.toggle("admin-health-warn", !enabled);
  }
};

const setStatusText = (node, text, stateClass = "") => {
  if (!node) {
    return;
  }
  node.textContent = text;
  node.classList.remove("admin-health-ok", "admin-health-warn");
  if (stateClass) {
    node.classList.add(stateClass);
  }
};

const switchView = (viewName) => {
  const nextView = String(viewName || "overview");
  for (const item of navItems) {
    item.classList.toggle("active", item.dataset.adminView === nextView);
  }
  for (const panel of viewPanels) {
    panel.classList.toggle("active", panel.dataset.adminViewPanel === nextView);
  }
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleString("vi-VN");
};

const readFiltersFromForm = () => {
  state.filters.email = String(filterEmail?.value || "").trim();
  state.filters.phone = String(filterPhone?.value || "").trim();
  state.filters.status = String(filterStatus?.value || "all").trim() || "all";
  state.filters.dateFrom = String(filterDateFrom?.value || "").trim();
  state.filters.dateTo = String(filterDateTo?.value || "").trim();
};

const resetFilters = () => {
  if (filterEmail) {
    filterEmail.value = "";
  }
  if (filterPhone) {
    filterPhone.value = "";
  }
  if (filterStatus) {
    filterStatus.value = "all";
  }
  if (filterDateFrom) {
    filterDateFrom.value = "";
  }
  if (filterDateTo) {
    filterDateTo.value = "";
  }
  readFiltersFromForm();
};

const buildLeadQuery = () => {
  const params = new URLSearchParams();
  params.set("limit", "200");
  if (state.filters.email) {
    params.set("email", state.filters.email);
  }
  if (state.filters.phone) {
    params.set("phone", state.filters.phone);
  }
  if (state.filters.status && state.filters.status !== "all") {
    params.set("status", state.filters.status);
  }
  if (state.filters.dateFrom) {
    params.set("dateFrom", state.filters.dateFrom);
  }
  if (state.filters.dateTo) {
    params.set("dateTo", state.filters.dateTo);
  }
  return params;
};

const createCell = (text, className = "") => {
  const cell = document.createElement("td");
  cell.textContent = String(text || "-");
  if (className) {
    cell.className = className;
  }
  return cell;
};

const createStatusBadge = (status) => {
  const span = document.createElement("span");
  const normalized = status === "processed" ? "processed" : "new";
  span.textContent = normalized === "processed" ? "Đã xử lý" : "Mới";
  span.className = `admin-status admin-status-${normalized}`;
  return span;
};

const createActionsCell = (lead) => {
  const cell = document.createElement("td");
  cell.className = "admin-actions-cell";
  const leadId = String(lead.leadId || "").trim();

  const processBtn = document.createElement("button");
  processBtn.type = "button";
  processBtn.dataset.action = "toggle-status";
  processBtn.dataset.leadId = leadId;
  processBtn.dataset.nextProcessed = lead.status === "processed" ? "false" : "true";
  processBtn.className = "admin-action-btn";
  processBtn.textContent = lead.status === "processed" ? "Đánh dấu mới" : "Đánh dấu xong";
  processBtn.disabled = !leadId;
  cell.appendChild(processBtn);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.dataset.action = "delete";
  deleteBtn.dataset.leadId = leadId;
  deleteBtn.className = "admin-action-btn admin-action-danger";
  deleteBtn.textContent = "Xóa";
  deleteBtn.disabled = !leadId;
  cell.appendChild(deleteBtn);

  return cell;
};

const updateStats = (leads) => {
  const rows = Array.isArray(leads) ? leads : [];
  const processed = rows.filter((lead) => lead.status === "processed").length;
  const fresh = rows.length - processed;
  if (statTotal) {
    statTotal.textContent = String(rows.length);
  }
  if (statNew) {
    statNew.textContent = String(fresh);
  }
  if (statProcessed) {
    statProcessed.textContent = String(processed);
  }
};

const renderRows = (leads) => {
  if (!tableBody) {
    return;
  }
  tableBody.replaceChildren();

  if (!Array.isArray(leads) || leads.length === 0) {
    const row = document.createElement("tr");
    const emptyCell = createCell("Chưa có lead nào.", "admin-cell-message");
    emptyCell.colSpan = 7;
    row.appendChild(emptyCell);
    tableBody.appendChild(row);
    return;
  }

  for (const lead of leads) {
    const row = document.createElement("tr");
    row.dataset.leadId = lead.leadId || "";
    if (lead.status === "processed") {
      row.classList.add("admin-row-processed");
    }
    row.appendChild(createCell(formatDate(lead.createdAt)));
    row.appendChild(createCell(lead.name || "-"));
    row.appendChild(createCell(lead.email || "-"));
    row.appendChild(createCell(lead.phone || "-", "admin-cell-phone"));

    const statusCell = document.createElement("td");
    statusCell.appendChild(createStatusBadge(lead.status));
    row.appendChild(statusCell);

    row.appendChild(createCell(lead.message || "-", "admin-cell-message"));
    row.appendChild(createActionsCell(lead));
    tableBody.appendChild(row);
  }
};

const ensureSession = async () => {
  const response = await fetch("/api/admin/session", {
    method: "GET",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    window.location.assign("/login");
    throw new Error("unauthorized");
  }
  return response.json().catch(() => ({}));
};

const loadLeads = async () => {
  const params = buildLeadQuery();
  setNote("Đang tải dữ liệu...");
  const response = await fetch(`/api/admin/leads?${params.toString()}`, {
    method: "GET",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok !== true) {
    if (response.status === 401) {
      window.location.assign("/login");
      return;
    }
    setNote("Không thể tải danh sách lead.", true);
    return;
  }
  state.leads = Array.isArray(payload.leads) ? payload.leads : [];
  updateStats(state.leads);
  renderRows(state.leads);
  setNote(`Đã tải ${state.leads.length} lead.`);
};

const callLeadAction = async (url, method, body) => {
  const options = {
    method,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok !== true) {
    if (response.status === 401) {
      window.location.assign("/login");
      return false;
    }
    if (response.status === 404) {
      setNote("Lead không tồn tại hoặc đã bị thay đổi.", true);
      return false;
    }
    setNote("Không thể cập nhật lead.", true);
    return false;
  }
  return true;
};

const toggleLeadStatus = async (leadId, nextProcessed) => {
  const ok = await callLeadAction(`/api/admin/leads/${encodeURIComponent(leadId)}/process`, "POST", {
    processed: Boolean(nextProcessed),
  });
  if (ok) {
    await loadLeads();
  }
};

const deleteLead = async (leadId) => {
  if (!window.confirm("Xóa lead này?")) {
    return;
  }
  const ok = await callLeadAction(`/api/admin/leads/${encodeURIComponent(leadId)}`, "DELETE");
  if (ok) {
    await loadLeads();
  }
};

const exportCsv = () => {
  const params = buildLeadQuery();
  const href = `/api/admin/leads/export.csv?${params.toString()}`;
  window.open(href, "_blank", "noopener");
};

const checkMaintenanceHealth = async () => {
  setMaintenanceNote("Đang kiểm tra trạng thái dịch vụ...");
  if (healthButton) {
    healthButton.disabled = true;
  }
  try {
    const [publicResponse, apiResponse] = await Promise.allSettled([
      fetch("/", { method: "GET", credentials: "same-origin", cache: "no-store" }),
      fetch("/api/admin/session", { method: "GET", credentials: "same-origin", cache: "no-store" }),
    ]);

    const publicOk = publicResponse.status === "fulfilled" && publicResponse.value.ok;
    const apiOk = apiResponse.status === "fulfilled" && apiResponse.value.ok;
    setStatusText(publicStatus, publicOk ? "Online" : "Cần kiểm tra", publicOk ? "admin-health-ok" : "admin-health-warn");
    setStatusText(apiStatus, apiOk ? "Online" : "Cần kiểm tra", apiOk ? "admin-health-ok" : "admin-health-warn");
    setMaintenanceNote(publicOk && apiOk ? "Website và Lead API đang phản hồi bình thường." : "Có dịch vụ chưa phản hồi đúng, cần kiểm tra server/nginx/PM2.", !(publicOk && apiOk));
  } catch (_error) {
    setStatusText(publicStatus, "Cần kiểm tra", "admin-health-warn");
    setStatusText(apiStatus, "Cần kiểm tra", "admin-health-warn");
    setMaintenanceNote("Không thể kiểm tra trạng thái dịch vụ.", true);
  } finally {
    if (healthButton) {
      healthButton.disabled = false;
    }
  }
};

const loadMaintenanceMode = async () => {
  const response = await fetch("/api/admin/maintenance", {
    method: "GET",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok !== true) {
    setMaintenanceToggleNote("Không thể đọc trạng thái bảo trì.", true);
    return;
  }
  renderMaintenanceState(Boolean(payload.enabled));
  setMaintenanceToggleNote(payload.enabled ? "Website public đang hiển thị trang bảo trì." : "Website public đang hoạt động bình thường.");
};

const renderMaintenanceConfig = (config = {}) => {
  setInputValue(maintenanceLogoUrl, config.logoUrl);
  setInputValue(maintenanceYoutubeUrl, config.youtubeUrl);
  setInputValue(maintenanceSoundcloudUrl, config.soundcloudUrl);
  setInputValue(maintenanceFacebookUrl, config.facebookUrl);
  state.maintenanceImageUrls = Array.isArray(config.imageUrls)
    ? config.imageUrls.map((item) => String(item || "").trim()).filter(Boolean)
    : String(config.imageUrl || "").trim()
      ? [String(config.imageUrl || "").trim()]
      : [];
  if (Array.isArray(config.mediaItems) && config.mediaItems.length > 0) {
    state.maintenanceImageUrls = normalizePreviewItems(config.mediaItems);
  }
  state.maintenanceImageDataUrls = [];
  if (maintenanceImageFile) {
    maintenanceImageFile.value = "";
  }
  if (maintenanceImageName) {
    maintenanceImageName.textContent = state.maintenanceImageUrls.length > 0
      ? `Đang dùng ${state.maintenanceImageUrls.length} file media đã lưu`
      : "Chưa chọn media. Tối đa 15 file ảnh/video, tổng 100MB.";
  }
  renderMaintenancePreview(state.maintenanceImageUrls);
};

const loadMaintenanceConfig = async () => {
  const response = await fetch("/api/admin/maintenance-config", {
    method: "GET",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok !== true) {
    setMaintenanceMediaNote("Không thể đọc cấu hình hiển thị bảo trì.", true);
    return;
  }
  renderMaintenanceConfig(payload.config || {});
  setMaintenanceMediaNote("Đã tải cấu hình hiển thị bảo trì.");
};

const saveMaintenanceConfig = async (removeImage = false) => {
  setMaintenanceMediaNote("Đang lưu cấu hình hiển thị...");
  const response = await fetch("/api/admin/maintenance-config", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      logoUrl: maintenanceLogoUrl?.value || "",
      youtubeUrl: maintenanceYoutubeUrl?.value || "",
      soundcloudUrl: maintenanceSoundcloudUrl?.value || "",
      facebookUrl: maintenanceFacebookUrl?.value || "",
      mediaDataUrls: removeImage ? [] : state.maintenanceImageDataUrls,
      removeImage,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok !== true) {
    const reason = payload.reason || payload.code || `http_${response.status}`;
    const messageByReason = {
      payload_too_large: "Dữ liệu gửi lên quá lớn. Tổng media tối đa 100MB.",
      media_total_too_large: "Tổng dung lượng ảnh/video tối đa 100MB.",
      media_too_large: "Một file đang vượt giới hạn 100MB.",
      too_many_images: "Chỉ được chọn tối đa 15 file.",
      invalid_media_data: "File không đúng định dạng cho phép.",
      invalid_url: "Có link chưa đúng định dạng.",
      invalid_url_protocol: "Link chỉ được dùng http hoặc https.",
      url_too_long: "Có link quá dài.",
    };
    setMaintenanceMediaNote(messageByReason[reason] || `Không thể lưu cấu hình (${reason}).`, true);
    return;
  }
  renderMaintenanceConfig(payload.config || {});
  setMaintenanceMediaNote("Đã lưu cấu hình hiển thị bảo trì.");
};

const updateMaintenanceMode = async (enabled) => {
  if (maintenanceToggle) {
    maintenanceToggle.disabled = true;
  }
  setMaintenanceToggleNote(enabled ? "Đang gạt sang Kích hoạt..." : "Đang gạt về Đóng...");
  try {
    const response = await fetch("/api/admin/maintenance", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ enabled: Boolean(enabled) }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok !== true) {
      throw new Error("maintenance_update_failed");
    }
    renderMaintenanceState(Boolean(payload.enabled));
    setMaintenanceToggleNote(payload.enabled ? "Đã gạt sang Kích hoạt. Khách truy cập public sẽ thấy thông báo bảo trì." : "Đã gạt về Đóng. Website public đã mở lại.");
  } catch (_error) {
    renderMaintenanceState(!enabled);
    setMaintenanceToggleNote("Không thể cập nhật chế độ bảo trì.", true);
  } finally {
    if (maintenanceToggle) {
      maintenanceToggle.disabled = false;
    }
  }
};

for (const item of navItems) {
  item.addEventListener("click", () => {
    switchView(item.dataset.adminView || "overview");
  });
}

filterForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  readFiltersFromForm();
  loadLeads().catch(() => {
    setNote("Không thể tải danh sách lead.", true);
  });
});

filterClear?.addEventListener("click", () => {
  resetFilters();
  loadLeads().catch(() => {
    setNote("Không thể tải danh sách lead.", true);
  });
});

refreshButton?.addEventListener("click", () => {
  readFiltersFromForm();
  loadLeads().catch(() => {
    setNote("Không thể tải danh sách lead.", true);
  });
});

exportButton?.addEventListener("click", () => {
  readFiltersFromForm();
  exportCsv();
});

healthButton?.addEventListener("click", () => {
  checkMaintenanceHealth();
});

maintenanceToggle?.addEventListener("change", () => {
  updateMaintenanceMode(maintenanceToggle.checked);
});

maintenanceImageFile?.addEventListener("change", () => {
  const files = Array.from(maintenanceImageFile.files || []);
  state.maintenanceImageDataUrls = [];
  if (files.length === 0) {
    if (maintenanceImageName) {
      maintenanceImageName.textContent = state.maintenanceImageUrls.length > 0
        ? `Đang dùng ${state.maintenanceImageUrls.length} file media đã lưu`
        : "Chưa chọn media. Tối đa 15 file ảnh/video, tổng 100MB.";
    }
    renderMaintenancePreview(state.maintenanceImageUrls);
    return;
  }
  if (files.length > 15) {
    setMaintenanceMediaNote("Chỉ được chọn tối đa 15 ảnh.", true);
    maintenanceImageFile.value = "";
    return;
  }
  const invalidFile = files.find((file) => !allowedMaintenanceMediaTypes.has(file.type));
  if (invalidFile) {
    setMaintenanceMediaNote("Chỉ hỗ trợ PNG, JPG, WEBP, GIF, MP4, WEBM hoặc OGG.", true);
    maintenanceImageFile.value = "";
    return;
  }
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > maxMaintenanceImageTotalBytes) {
    setMaintenanceMediaNote("Tổng dung lượng ảnh/video tối đa 100MB.", true);
    maintenanceImageFile.value = "";
    return;
  }

  Promise.all(files.map((file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(new Error("file_read_failed")));
    reader.readAsDataURL(file);
  }))).then((items) => {
    state.maintenanceImageDataUrls = items.filter(Boolean);
    if (maintenanceImageName) {
      maintenanceImageName.textContent = `${state.maintenanceImageDataUrls.length} file media đã chọn`;
    }
    renderMaintenancePreview(state.maintenanceImageDataUrls);
    setMaintenanceMediaNote("Media đã sẵn sàng. Bấm Lưu hiển thị để cập nhật slideshow.");
  }).catch(() => {
    setMaintenanceMediaNote("Không thể đọc ảnh đã chọn.", true);
  });
});

maintenanceMediaForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  saveMaintenanceConfig(false).catch(() => {
    setMaintenanceMediaNote("Không thể lưu cấu hình hiển thị.", true);
  });
});

maintenanceImageRemove?.addEventListener("click", () => {
  if (maintenanceImageFile) {
    maintenanceImageFile.value = "";
  }
  state.maintenanceImageDataUrls = [];
  saveMaintenanceConfig(true).catch(() => {
    setMaintenanceMediaNote("Không thể bỏ ảnh hiển thị.", true);
  });
});

logoutButton?.addEventListener("click", async () => {
  try {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({}),
    });
  } finally {
    window.location.assign("/login");
  }
});

tableBody?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const actionButton = target.closest("button[data-action]");
  if (!(actionButton instanceof HTMLButtonElement)) {
    return;
  }
  const action = actionButton.dataset.action || "";
  const leadId = actionButton.dataset.leadId || "";
  if (!leadId) {
    setNote("Lead này chưa có mã định danh để cập nhật.", true);
    return;
  }
  if (actionButton.disabled) {
    return;
  }
  actionButton.disabled = true;
  const restoreButton = () => {
    if (document.body.contains(actionButton)) {
      actionButton.disabled = false;
    }
  };

  if (action === "toggle-status") {
    const nextProcessed = actionButton.dataset.nextProcessed === "true";
    toggleLeadStatus(leadId, nextProcessed).catch(() => {
      setNote("Không thể cập nhật lead.", true);
    }).finally(restoreButton);
    return;
  }

  if (action === "delete") {
    deleteLead(leadId).catch(() => {
      setNote("Không thể xóa lead.", true);
    }).finally(restoreButton);
    return;
  }

  restoreButton();
});

Promise.resolve()
  .then(ensureSession)
  .then(() => {
    switchView("overview");
    readFiltersFromForm();
    return Promise.all([loadLeads(), loadMaintenanceMode(), loadMaintenanceConfig()]);
  })
  .catch(() => {
    setNote("Không thể tải dashboard.", true);
  });


const storageFileInput = document.getElementById("admin-storage-file-input");
const storageFileName = document.getElementById("admin-storage-file-name");
const storageUploadForm = document.getElementById("admin-storage-upload-form");
const storageUploadButton = document.getElementById("admin-storage-upload-btn");
const storagePauseButton = document.getElementById("admin-storage-pause-btn");
const storageUploadNote = document.getElementById("admin-storage-upload-note");
const storageUploadProgress = document.getElementById("admin-storage-upload-progress");
const storageUploadProgressBar = document.getElementById("admin-storage-upload-progress-bar");
const storageUploadProgressText = document.getElementById("admin-storage-upload-progress-text");
const storageNote = document.getElementById("admin-storage-note");
const storageRefreshButton = document.getElementById("admin-storage-refresh-btn");
const storageFilesBody = document.getElementById("admin-storage-files-body");
const storageSearch = document.getElementById("admin-storage-search");
const storageStatCount = document.getElementById("admin-storage-stat-count");
const storageStatSize = document.getElementById("admin-storage-stat-size");
const storageStatFree = document.getElementById("admin-storage-stat-free");
const storageApiStatus = document.getElementById("admin-storage-api-status");
const storageMaxUpload = document.getElementById("admin-storage-max-upload");
const storageFolderForm = document.getElementById("admin-storage-folder-form");
const storageFolderNameInput = document.getElementById("admin-storage-folder-name");
const storageFoldersBody = document.getElementById("admin-storage-folders-body");

state.storageFiles = [];
state.storageFolders = [];

const formatBytes = (value) => {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let size = Number(value) || 0;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const setStorageNote = (message, isError = false) => {
  if (!storageNote) return;
  storageNote.textContent = message;
  storageNote.classList.toggle("admin-note-error", Boolean(isError));
};

const setStorageUploadNote = (message, isError = false) => {
  if (!storageUploadNote) return;
  storageUploadNote.textContent = message;
  storageUploadNote.classList.toggle("admin-note-error", Boolean(isError));
};


const setStorageUploadProgress = (percent, visible = true) => {
  const normalized = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  if (storageUploadProgress) {
    storageUploadProgress.hidden = !visible;
    storageUploadProgress.classList.toggle("is-complete", normalized >= 100);
  }
  if (storageUploadProgressBar) {
    storageUploadProgressBar.style.width = `${normalized}%`;
  }
  if (storageUploadProgressText) {
    storageUploadProgressText.textContent = `${normalized}%`;
  }
};

const hideStorageUploadProgress = () => {
  window.setTimeout(() => setStorageUploadProgress(0, false), 850);
};

let storageUploadPaused = false;
let storageUploadResumeResolver = null;

const setStoragePauseButtonVisible = (visible) => {
  if (!storagePauseButton) return;
  storagePauseButton.hidden = !visible;
};

const setStorageUploadPaused = (paused) => {
  storageUploadPaused = Boolean(paused);
  if (storagePauseButton) {
    storagePauseButton.textContent = storageUploadPaused ? "Tiếp tục" : "Tạm dừng";
    storagePauseButton.classList.toggle("is-paused", storageUploadPaused);
  }
  if (!storageUploadPaused && storageUploadResumeResolver) {
    storageUploadResumeResolver();
    storageUploadResumeResolver = null;
  }
};

const waitForStorageUploadResume = async () => {
  if (!storageUploadPaused) return;
  setStorageUploadNote("Đã tạm dừng upload. Bấm Tiếp tục để chạy tiếp.");
  await new Promise((resolve) => {
    storageUploadResumeResolver = resolve;
  });
};

const getStorageFolderSummary = () => {
  const summary = new Map((state.storageFolders || []).map((folder) => [folder.id, { ...folder, count: 0, bytes: 0 }]));
  for (const file of state.storageFiles || []) {
    if (file.folderId && summary.has(file.folderId)) {
      const item = summary.get(file.folderId);
      item.count += 1;
      item.bytes += Number(file.size) || 0;
    }
  }
  return Array.from(summary.values());
};

const renderAdminStorageFolders = () => {
  if (!storageFoldersBody) return;
  storageFoldersBody.replaceChildren();
  const rows = getStorageFolderSummary();
  if (rows.length === 0) {
    const row = document.createElement("tr");
    const cell = createCell("Chưa có thư mục.", "admin-cell-message");
    cell.colSpan = 5;
    row.appendChild(cell);
    storageFoldersBody.appendChild(row);
    return;
  }
  for (const folder of rows) {
    const row = document.createElement("tr");
    row.appendChild(createCell(folder.name));
    row.appendChild(createCell(String(folder.count)));
    row.appendChild(createCell(formatBytes(folder.bytes)));
    const actions = document.createElement("td");
    actions.className = "admin-actions-cell";
    const del = document.createElement("button");
    del.type = "button";
    del.className = "admin-action-btn admin-action-danger";
    del.dataset.storageFolderDelete = folder.id;
    del.textContent = "Xóa";
    actions.appendChild(del);
    row.appendChild(actions);
    storageFoldersBody.appendChild(row);
  }
};

const renderAdminStorageFiles = () => {
  if (!storageFilesBody) return;
  const query = String(storageSearch?.value || "").trim().toLowerCase();
  const rows = (Array.isArray(state.storageFiles) ? state.storageFiles : []).filter((file) =>
    !query || String(file.name || "").toLowerCase().includes(query)
  );
  storageFilesBody.replaceChildren();
  if (rows.length === 0) {
    const row = document.createElement("tr");
    const cell = createCell("Không có file phù hợp.", "admin-cell-message");
    cell.colSpan = 4;
    row.appendChild(cell);
    storageFilesBody.appendChild(row);
    return;
  }
  for (const file of rows) {
    const row = document.createElement("tr");
    row.appendChild(createCell(file.name || "-"));
    row.appendChild(createCell(formatBytes(file.size)));
    row.appendChild(createCell(formatDate(file.modifiedAt)));
    const folderCell = document.createElement("td");
    const select = document.createElement("select");
    select.className = "admin-storage-folder-select";
    select.dataset.storageFileFolder = file.name || "";
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "Chưa phân loại";
    select.appendChild(none);
    for (const folder of state.storageFolders || []) {
      const option = document.createElement("option");
      option.value = folder.id;
      option.textContent = folder.name;
      option.selected = file.folderId === folder.id;
      select.appendChild(option);
    }
    folderCell.appendChild(select);
    row.appendChild(folderCell);
    const actions = document.createElement("td");
    actions.className = "admin-actions-cell";
    const lock = document.createElement("button");
    lock.type = "button";
    lock.className = file.downloadLocked ? "admin-action-btn admin-action-open" : "admin-action-btn admin-action-lock";
    lock.dataset.storageDownloadLock = file.name || "";
    lock.dataset.storageDownloadLockEnabled = file.downloadLocked ? "false" : "true";
    lock.textContent = file.downloadLocked ? "Mở tải" : "Khóa tải";
    const del = document.createElement("button");
    del.type = "button";
    del.className = "admin-action-btn admin-action-danger";
    del.dataset.storageDelete = file.name || "";
    del.textContent = "Xóa";
    actions.append(lock, del);
    row.appendChild(actions);
    storageFilesBody.appendChild(row);
  }
};

const loadAdminStorageFiles = async () => {
  if (!storageFilesBody) return;
  setStorageNote("Đang tải danh sách file...");
  const response = await fetch("/api/admin/storage/files", {
    method: "GET",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok !== true) {
    if (response.status === 401) {
      window.location.assign("/login");
      return;
    }
    setStorageNote("Không thể tải danh sách storage.", true);
    setStatusText(storageApiStatus, "Cần kiểm tra", "admin-health-warn");
    return;
  }
  state.storageFiles = Array.isArray(payload.files) ? payload.files : [];
  state.storageFolders = Array.isArray(payload.folders) ? payload.folders : [];
  if (storageStatCount) storageStatCount.textContent = String(state.storageFiles.length);
  if (storageStatSize) storageStatSize.textContent = formatBytes(payload.totalBytes || 0);
  if (storageStatFree) storageStatFree.textContent = formatBytes(payload.disk?.freeBytes || 0);
  if (storageMaxUpload) storageMaxUpload.textContent = formatBytes(payload.maxUploadBytes || 0);
  setStatusText(storageApiStatus, "Online", "admin-health-ok");
  renderAdminStorageFiles();
  renderAdminStorageFolders();
  setStorageNote(`Đã tải ${state.storageFiles.length} file storage.`);
};

const storageChunkBytes = 8 * 1024 * 1024;

const createStorageUploadId = () => {
  const randomPart = window.crypto?.getRandomValues
    ? Array.from(window.crypto.getRandomValues(new Uint32Array(4))).map((item) => item.toString(36)).join("")
    : Math.random().toString(36).slice(2);
  return `${Date.now().toString(36)}-${randomPart}`;
};

const uploadStorageFileChunked = async (file, fileIndex, fileTotal, uploadedBefore, uploadTotal) => {
  const chunkTotal = Math.max(1, Math.ceil(file.size / storageChunkBytes));
  const uploadId = createStorageUploadId();
  for (let chunkIndex = 0; chunkIndex < chunkTotal; chunkIndex += 1) {
    await waitForStorageUploadResume();
    const start = chunkIndex * storageChunkBytes;
    const end = Math.min(file.size, start + storageChunkBytes);
    const chunk = file.slice(start, end);
    const currentBytes = uploadedBefore + start;
    const progressPercent = Math.max(1, Math.min(99, Math.round((currentBytes / Math.max(uploadTotal, 1)) * 100)));
    setStorageUploadProgress(progressPercent, true);
    setStorageUploadNote(`Đang upload ${fileIndex + 1}/${fileTotal}: ${file.name} - phần ${chunkIndex + 1}/${chunkTotal} (${progressPercent}%)...`);
    const params = new URLSearchParams({
      filename: file.name,
      uploadId,
      chunkIndex: String(chunkIndex),
      chunkTotal: String(chunkTotal),
      totalSize: String(file.size),
    });
    let lastError = null;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await waitForStorageUploadResume();
      try {
        if (attempt > 1) {
          setStorageUploadNote(`Đang thử lại ${attempt - 1}/3: ${file.name} - phần ${chunkIndex + 1}/${chunkTotal}...`);
          await new Promise((resolve) => window.setTimeout(resolve, 800 * attempt));
          await waitForStorageUploadResume();
        }
        const response = await fetch(`/api/admin/storage/upload-chunk?${params.toString()}`, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "X-Storage-File-Name": encodeURIComponent(file.name),
            Accept: "application/json",
          },
          body: chunk,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.ok !== true) {
          throw new Error(payload.code || `http_${response.status}`);
        }
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (attempt >= 4) {
          throw error;
        }
      }
    }
    if (lastError) {
      throw lastError;
    }
    const sentBytes = uploadedBefore + end;
    const sentPercent = Math.max(1, Math.min(99, Math.round((sentBytes / Math.max(uploadTotal, 1)) * 100)));
    setStorageUploadProgress(sentPercent, true);
  }
};

const uploadStorageFiles = async () => {
  const files = Array.from(storageFileInput?.files || []);
  if (files.length === 0) {
    setStorageUploadNote("Chưa chọn file để upload.", true);
    return;
  }
  if (storageUploadButton) storageUploadButton.disabled = true;
  setStorageUploadPaused(false);
  setStoragePauseButtonVisible(true);
  const uploadTotal = files.reduce((sum, file) => sum + file.size, 0);
  let uploadedBefore = 0;
  setStorageUploadProgress(1, true);
  try {
    for (const [index, file] of files.entries()) {
      await waitForStorageUploadResume();
      await uploadStorageFileChunked(file, index, files.length, uploadedBefore, uploadTotal);
      uploadedBefore += file.size;
      setStorageUploadProgress(Math.max(1, Math.min(99, Math.round((uploadedBefore / Math.max(uploadTotal, 1)) * 100))), true);
    }
    setStorageUploadProgress(100, true);
    if (storageFileInput) storageFileInput.value = "";
    if (storageFileName) storageFileName.textContent = "Chưa chọn file.";
    setStorageUploadNote("Upload hoàn tất.");
    hideStorageUploadProgress();
    await loadAdminStorageFiles();
  } catch (error) {
    const code = error && error.message ? error.message : "upload_failed";
    const message = code === "payload_too_large"
      ? "File vượt giới hạn 15 GiB hiện tại."
      : code === "chunk_too_large"
        ? "Một phần upload vượt giới hạn Cloudflare. Hãy tải lại trang rồi thử lại."
        : code === "unexpected_chunk_order" || code === "missing_upload_session"
          ? "Phiên upload bị gián đoạn. Hãy chọn file và upload lại."
          : `Upload thất bại (${code}). Hãy kiểm tra kết nối rồi thử lại.`;
    setStorageUploadProgress(0, false);
    setStorageUploadNote(message, true);
  } finally {
    setStorageUploadPaused(false);
    setStoragePauseButtonVisible(false);
    if (storageUploadButton) storageUploadButton.disabled = false;
  }
};

storageFileInput?.addEventListener("change", () => {
  const files = Array.from(storageFileInput.files || []);
  if (storageFileName) {
    storageFileName.textContent = files.length > 0
      ? `${files.length} file đã chọn, tổng ${formatBytes(files.reduce((sum, file) => sum + file.size, 0))}`
      : "Chưa chọn file.";
  }
});

storageUploadForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  uploadStorageFiles().catch(() => setStorageUploadNote("Upload thất bại.", true));
});

storagePauseButton?.addEventListener("click", () => {
  setStorageUploadPaused(!storageUploadPaused);
  setStorageUploadNote(storageUploadPaused ? "Sẽ tạm dừng sau phần đang gửi." : "Đang tiếp tục upload...");
});


storageFolderForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = String(storageFolderNameInput?.value || "").trim();
  if (!name) {
    setStorageNote("Nhập tên thư mục trước.", true);
    return;
  }
  const response = await fetch("/api/admin/storage/folders", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ name }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok !== true) {
    setStorageNote(payload.code === "folder_exists" ? "Thư mục này đã tồn tại." : "Không thể tạo thư mục.", true);
    return;
  }
  if (storageFolderNameInput) storageFolderNameInput.value = "";
  setStorageNote("Đã tạo thư mục.");
  await loadAdminStorageFiles();
});

storageFoldersBody?.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest("button[data-storage-folder-delete]");
  if (!(button instanceof HTMLButtonElement)) return;
  const folderId = button.dataset.storageFolderDelete || "";
  if (!folderId || !window.confirm("Xóa thư mục này? File bên trong sẽ chuyển về Chưa phân loại.")) return;
  button.disabled = true;
  const response = await fetch(`/api/admin/storage/folders/${encodeURIComponent(folderId)}`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok !== true) {
    setStorageNote("Không thể xóa thư mục.", true);
    button.disabled = false;
    return;
  }
  setStorageNote("Đã xóa thư mục.");
  await loadAdminStorageFiles();
});

storageRefreshButton?.addEventListener("click", () => {
  loadAdminStorageFiles().catch(() => setStorageNote("Không thể tải danh sách storage.", true));
});

storageSearch?.addEventListener("input", renderAdminStorageFiles);

storageFilesBody?.addEventListener("change", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement) || !target.dataset.storageFileFolder) return;
  target.disabled = true;
  const response = await fetch("/api/admin/storage/file-folder", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ fileName: target.dataset.storageFileFolder, folderId: target.value }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok !== true) {
    setStorageNote("Không thể gán thư mục cho file.", true);
    target.disabled = false;
    return;
  }
  setStorageNote("Đã cập nhật thư mục file.");
  await loadAdminStorageFiles();
});

storageFilesBody?.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const lockButton = target.closest("button[data-storage-download-lock]");
  if (lockButton instanceof HTMLButtonElement) {
    const fileName = lockButton.dataset.storageDownloadLock || "";
    const enabled = lockButton.dataset.storageDownloadLockEnabled === "true";
    if (!fileName) return;
    lockButton.disabled = true;
    const response = await fetch("/api/admin/storage/file-download-lock", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ fileName, enabled }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok !== true) {
      setStorageNote("Không thể cập nhật khóa tải file.", true);
      lockButton.disabled = false;
      return;
    }
    setStorageNote(enabled ? `Đã khóa tải xuống: ${fileName}` : `Đã mở tải xuống: ${fileName}`);
    await loadAdminStorageFiles();
    return;
  }
  const button = target.closest("button[data-storage-delete]");
  if (!(button instanceof HTMLButtonElement)) return;
  const fileName = button.dataset.storageDelete || "";
  if (!fileName || !window.confirm(`Xóa file ${fileName}?`)) return;
  button.disabled = true;
  const response = await fetch(`/api/admin/storage/files/${encodeURIComponent(fileName)}`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok !== true) {
    setStorageNote("Không thể xóa file storage.", true);
    button.disabled = false;
    return;
  }
  setStorageNote("Đã xóa file storage.");
  await loadAdminStorageFiles();
});

for (const item of navItems) {
  if (item.dataset.adminView === "storage") {
    item.addEventListener("click", () => {
      loadAdminStorageFiles().catch(() => setStorageNote("Không thể tải danh sách storage.", true));
    });
  }
}
