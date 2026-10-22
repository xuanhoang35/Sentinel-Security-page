"use strict";

const hashRoute = window.location.hash.toLowerCase();
const isLocalHost = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
const localBackendBase =
  isLocalHost && window.location.port !== "8787"
    ? `${window.location.protocol}//${window.location.hostname}:8787`
    : "";
if (hashRoute === "#login") {
  window.location.replace(localBackendBase ? `${localBackendBase}/login` : "/login");
}
if (hashRoute === "#admin") {
  window.location.replace(localBackendBase ? `${localBackendBase}/admin` : "/admin");
}

const revealItems = document.querySelectorAll(".reveal");
const nav = document.getElementById("primary-nav");
const menuToggle = document.querySelector(".menu-toggle");
const navBackdrop = document.querySelector(".nav-backdrop");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.2,
  }
);

revealItems.forEach((item) => revealObserver.observe(item));

const closeNav = () => {
  if (!menuToggle) {
    return;
  }
  document.body.classList.remove("nav-open");
  menuToggle.setAttribute("aria-expanded", "false");
};

const openNav = () => {
  if (!menuToggle) {
    return;
  }
  document.body.classList.add("nav-open");
  menuToggle.setAttribute("aria-expanded", "true");
};

if (menuToggle && nav && navBackdrop) {
  menuToggle.addEventListener("click", () => {
    const isOpen = document.body.classList.contains("nav-open");
    if (isOpen) {
      closeNav();
    } else {
      openNav();
    }
  });

  navBackdrop.addEventListener("click", closeNav);

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeNav);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNav();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 720) {
      closeNav();
    }
  });
}

const isSectionHash = (hash) => {
  const normalized = String(hash || "").trim().toLowerCase();
  return normalized.startsWith("#") && normalized !== "#login" && normalized !== "#admin";
};

const scrollToHashSection = (hash, smooth = true) => {
  const target = document.querySelector(String(hash || "").trim());
  if (!target) {
    return false;
  }
  target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  return true;
};

const clearUrlHash = () => {
  if (!window.location.hash || !window.history || typeof window.history.replaceState !== "function") {
    return;
  }
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
};

if (isSectionHash(hashRoute)) {
  if (scrollToHashSection(window.location.hash || hashRoute, false)) {
    clearUrlHash();
  }
}

document.querySelectorAll('a[href^="#"]').forEach((anchorLink) => {
  const href = String(anchorLink.getAttribute("href") || "").trim();
  if (!isSectionHash(href)) {
    return;
  }
  anchorLink.addEventListener("click", (event) => {
    if (!scrollToHashSection(href, true)) {
      return;
    }
    event.preventDefault();
    clearUrlHash();
  });
});

const form = document.querySelector(".contact-form");
const formNote = document.getElementById("form-note");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const messageInput = document.getElementById("message");
const websiteInput = document.getElementById("website");
const submitButton = form?.querySelector('button[type="submit"]');
const isEnglish = document.documentElement.lang.toLowerCase().startsWith("en");

const messages = isEnglish
  ? {
      formUnavailable: "System is temporarily unavailable. Please try again.",
      trapAccepted: "Request received. Our team will contact you shortly.",
      nameInvalid: "Name must be between 2 and 80 characters.",
      emailInvalid: "Email format is invalid.",
      phoneInvalid: "Phone number is invalid.",
      messageInvalid: "Message must be between 20 and 2000 characters.",
      sending: "Submitting your request...",
      tooFast: "Please take a moment to complete the form before submitting.",
      rateLimited: "You have submitted recently. Please wait 30 seconds and try again.",
      submitError: "Submission failed. Please try again or email hovanduy1104@gmail.com.",
      success: "Request received. We will contact you within 1 business hour.",
    }
  : {
      formUnavailable: "Hệ thống tạm thời không sẵn sàng. Vui lòng thử lại.",
      trapAccepted: "Đã ghi nhận yêu cầu. Chúng tôi sẽ liên hệ với bạn sớm.",
      nameInvalid: "Họ tên cần từ 2 đến 80 ký tự.",
      emailInvalid: "Email không hợp lệ.",
      phoneInvalid: "Số điện thoại không hợp lệ.",
      messageInvalid: "Nội dung cần từ 20 đến 2000 ký tự.",
      sending: "Đang gửi yêu cầu...",
      tooFast: "Vui lòng điền form đầy đủ trước khi gửi.",
      rateLimited: "Bạn vừa gửi yêu cầu. Vui lòng chờ 30 giây rồi thử lại.",
      submitError: "Gửi yêu cầu thất bại. Vui lòng thử lại hoặc email hovanduy1104@gmail.com.",
      success: "Đã ghi nhận yêu cầu. Chúng tôi sẽ liên hệ với bạn trong 1 giờ làm việc.",
    };

const formStartAt = Date.now();
const minFillTimeMs = 2500;
const rateLimitMs = 30000;
const submitStorageKey = "lead_last_submitted_at";

const setNote = (message, color) => {
  if (!formNote) {
    return;
  }
  formNote.textContent = message;
  formNote.style.color = color;
};

const sanitizeText = (value) =>
  value.replace(/[<>"'`]/g, "").replace(/\s+/g, " ").trim();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
const normalizePhone = (value) => value.replace(/[^\d+]/g, "").trim();
const isValidPhone = (value) => {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
};


const setSubmitState = (isSubmitting) => {
  if (!submitButton) {
    return;
  }
  if (!submitButton.dataset.defaultLabel) {
    submitButton.dataset.defaultLabel = submitButton.textContent || "";
  }
  submitButton.disabled = isSubmitting;
  submitButton.textContent = isSubmitting
    ? messages.sending
    : submitButton.dataset.defaultLabel;
};

const submittedRecently = () => {
  let lastSubmittedAtRaw = "0";
  try {
    lastSubmittedAtRaw = window.localStorage.getItem(submitStorageKey) || "0";
  } catch (_error) {
    return false;
  }
  const lastSubmittedAt = Number(lastSubmittedAtRaw);
  return Number.isFinite(lastSubmittedAt) && Date.now() - lastSubmittedAt < rateLimitMs;
};

const markSubmittedNow = () => {
  try {
    window.localStorage.setItem(submitStorageKey, String(Date.now()));
  } catch (_error) {
    // Ignore storage issues; submission already succeeded.
  }
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!nameInput || !emailInput || !phoneInput || !messageInput || !websiteInput) {
    setNote(messages.formUnavailable, "#ff8a3d");
    return;
  }

  if (websiteInput.value.trim() !== "") {
    setNote(messages.trapAccepted, "#30f2b0");
    form.reset();
    return;
  }

  if (Date.now() - formStartAt < minFillTimeMs) {
    setNote(messages.tooFast, "#ff8a3d");
    return;
  }

  if (submittedRecently()) {
    setNote(messages.rateLimited, "#ff8a3d");
    return;
  }

  const cleanName = sanitizeText(nameInput.value);
  const cleanEmail = sanitizeText(emailInput.value).toLowerCase();
  const cleanPhone = normalizePhone(phoneInput.value);
  const cleanMessage = sanitizeText(messageInput.value);

  if (cleanName.length < 2 || cleanName.length > 80) {
    setNote(messages.nameInvalid, "#ff8a3d");
    return;
  }

  if (!isValidEmail(cleanEmail) || cleanEmail.length > 254) {
    setNote(messages.emailInvalid, "#ff8a3d");
    return;
  }

  if (!isValidPhone(cleanPhone)) {
    setNote(messages.phoneInvalid, "#ff8a3d");
    return;
  }

  if (cleanMessage.length < 20 || cleanMessage.length > 2000) {
    setNote(messages.messageInvalid, "#ff8a3d");
    return;
  }

  const endpoint = form.dataset.endpoint || "/api/lead";
  if (!endpoint) {
    setNote(messages.submitError, "#ff8a3d");
    return;
  }

  const payload = {
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    message: cleanMessage,
    website: "",
    language: isEnglish ? "en" : "vi",
    sourceUrl: (() => {
      try {
        const currentUrl = new URL(window.location.href);
        currentUrl.hash = "";
        return currentUrl.toString();
      } catch (_error) {
        return window.location.origin || "";
      }
    })(),
  };

  setSubmitState(true);
  setNote(messages.sending, "#9bb0cc");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    const isSuccess = response.ok && data.ok === true;

    if (!isSuccess) {
      throw new Error("Lead submission rejected");
    }

    markSubmittedNow();
    setNote(messages.success, "#30f2b0");
    form.reset();
  } catch (_error) {
    setNote(messages.submitError, "#ff8a3d");
  } finally {
    setSubmitState(false);
  }
});
