"use strict";

const GATEWAY_URL = localStorage.getItem("gatewayUrl") || `${window.location.protocol}//localhost:8765`;

/* ── TOAST ───────────────────────────────────────────────────────── */
function showToast(message, type = "error") {
    document.querySelector(".itb-toast")?.remove();

    const toast = document.createElement("div");
    toast.className = `itb-toast itb-toast--${type}`;
    toast.innerHTML = `<i class="fas fa-${type === "error" ? "circle-xmark" : "circle-check"}"></i> ${message}`;
    document.querySelector(".card-body").prepend(toast);

    requestAnimationFrame(() => toast.classList.add("itb-toast--visible"));
    setTimeout(() => {
        toast.classList.remove("itb-toast--visible");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/* ── TOGGLE PASSWORD ─────────────────────────────────────────────── */
function bindToggle(buttonId, inputId) {
    const btn = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;

    btn.addEventListener("click", () => {
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        btn.querySelector("i").classList.toggle("fa-eye", !isPassword);
        btn.querySelector("i").classList.toggle("fa-eye-slash", isPassword);
    });
}

/* ── PASSWORD VALIDATION ─────────────────────────────────────────── */
const reqs = {
    "req-len": (v) => v.length >= 8,
    "req-upper": (v) => /[A-Z]/.test(v),
    "req-num": (v) => /[0-9]/.test(v),
};

function validatePassword(val) {
    for (const [id, test] of Object.entries(reqs)) {
        const el = document.getElementById(id);
        const icon = el.querySelector("i");
        const met = test(val);
        el.classList.toggle("met", met);
        icon.className = met ? "fas fa-circle-check" : "fas fa-circle-xmark";
    }
    return Object.values(reqs).every((fn) => fn(val));
}

bindToggle("toggleNewPassword", "newPassword");
bindToggle("toggleConfirmPassword", "confirmNewPassword");

const newPasswordInput = document.getElementById("newPassword");
const confirmInput = document.getElementById("confirmNewPassword");

newPasswordInput.addEventListener("input", () => {
    const val = newPasswordInput.value;
    const allMet = validatePassword(val);
    newPasswordInput.classList.toggle("valid", allMet && val.length > 0);
    newPasswordInput.classList.toggle("invalid", !allMet && val.length > 0);
});

confirmInput.addEventListener("input", () => {
    const matches = confirmInput.value === newPasswordInput.value && confirmInput.value.length > 0;
    confirmInput.classList.toggle("valid", matches);
    confirmInput.classList.toggle("invalid", !matches && confirmInput.value.length > 0);
});

/* ── RESET FORM ──────────────────────────────────────────────────── */
document.getElementById("resetPasswordForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newPassword = formData.get("newPassword");
    const confirmPassword = formData.get("confirmNewPassword");

    if (!validatePassword(newPassword)) {
        showToast("Please meet all password requirements.");
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast("Passwords do not match.");
        return;
    }

    try {
        const response = await fetch(`${GATEWAY_URL}/user-service/api/auth/resetPassword`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: formData.get("email"),
                newPassword,
                confirmNewPassword: confirmPassword,
            }),
        });

        const data = await response.json();
        if (response.ok) {
            showToast("Password reset! Redirecting…", "success");
            setTimeout(() => (window.location.href = "/login.html"), 1500);
        } else {
            showToast(data.message || "Reset failed. Please try again.");
        }
    } catch (error) {
        showToast("Connection error. Please try again.");
        console.error(error);
    }
});