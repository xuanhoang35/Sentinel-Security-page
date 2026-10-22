"use strict";

const isLocalHost = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
if (isLocalHost && window.location.port && window.location.port !== "8787") {
  const target = `${window.location.protocol}//${window.location.hostname}:8787/login`;
  window.location.replace(target);
}

const form = document.getElementById("admin-login-form");
const note = document.getElementById("admin-login-note");
const mfaWrap = document.getElementById("admin-mfa-wrap");
const challengeTokenInput = document.getElementById("admin-mfa-challenge-token");
const totpInput = document.getElementById("admin-totp-code");

const setNote = (message, isError = false) => {
  if (!note) {
    return;
  }
  note.textContent = message;
  note.classList.toggle("admin-note-error", Boolean(isError));
};

const setMfaMode = (enabled) => {
  if (mfaWrap) {
    mfaWrap.hidden = !enabled;
  }
  const submitButton = form?.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = "\u0110\u0103ng nh\u1eadp";
  }
  const emailInput = form?.querySelector('input[name="email"]');
  const passwordInput = form?.querySelector('input[name="password"]');
  if (emailInput) {
    emailInput.readOnly = enabled;
  }
  if (passwordInput) {
    passwordInput.readOnly = enabled;
  }
  if (!enabled) {
    if (challengeTokenInput) {
      challengeTokenInput.value = "";
    }
    if (totpInput) {
      totpInput.value = "";
    }
  }
};

setMfaMode(false);

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const emailInput = form.querySelector('input[name="email"]');
  const passwordInput = form.querySelector('input[name="password"]');
  const submitButton = form.querySelector('button[type="submit"]');
  const challengeToken = String(challengeTokenInput?.value || "").trim();
  const mfaMode = challengeToken.length > 0;

  const email = String(emailInput?.value || "").trim().toLowerCase();
  const password = String(passwordInput?.value || "");
  const totpCode = String(totpInput?.value || "").replace(/\s+/g, "").trim();

  if (!email || !password) {
    setNote("Vui lòng nhập email và mật khẩu.", true);
    return;
  }
  if (mfaMode && !/^\d{6}$/.test(totpCode)) {
    setNote("Vui l\u00f2ng nh\u1eadp secret code.", true);
    return;
  }

  setNote("\u0110ang x\u00e1c th\u1ef1c...");
  if (submitButton) {
    submitButton.disabled = true;
  }

  try {
    const requestPath = mfaMode ? "/api/admin/login/mfa" : "/api/admin/login";
    const requestBody = mfaMode
      ? {
          challengeToken,
          totpCode,
        }
      : {
          email,
          password,
        };
    const response = await fetch(requestPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify(requestBody),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok !== true) {
      if (response.status === 404) {
        setNote("Ban dang mo trang tinh. Hay vao http://127.0.0.1:8787/login", true);
        return;
      }
      if (response.status === 403) {
        setNote("Nguon truy cap bi chan. Hay mo dung domain backend.", true);
        return;
      }
      if (payload.code === "rate_limited") {
        setNote("Bạn thao tác quá nhanh, vui lòng thử lại sau.", true);
        return;
      }
      if (payload.code === "mfa_challenge_invalid") {
        setMfaMode(false);
        setNote("Phien xac thuc OTP da het han. Vui long dang nhap lai.", true);
        return;
      }
      if (payload.code === "invalid_totp") {
        setNote("Ma OTP khong dung hoac da het han 30 giay.", true);
        return;
      }
      setNote(
        mfaMode
          ? "\u0110\u0103ng nh\u1eadp th\u1ea5t b\u1ea1i."
          : "Sai t\u00e0i kho\u1ea3n ho\u1eb7c m\u1eadt kh\u1ea9u.",
        true
      );
      return;
    }

    if (payload.mfaRequired === true && payload.challengeToken) {
      if (challengeTokenInput) {
        challengeTokenInput.value = String(payload.challengeToken);
      }
      setMfaMode(true);
      if (totpInput) {
        totpInput.focus();
      }
      return;
    }

    window.location.assign("/admin");
  } catch (_error) {
    setNote("Khong the ket noi may chu.", true);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
});
