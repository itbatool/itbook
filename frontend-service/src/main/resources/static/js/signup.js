"use strict";

const GATEWAY_URL = localStorage.getItem("gatewayUrl") || `${window.location.protocol}//localhost:8765`;

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

function makeToggle(btnId, inputId) {
    document.getElementById(btnId).addEventListener("click", function () {
        const inp = document.getElementById(inputId);
        const hidden = inp.getAttribute("type") === "password";
        inp.setAttribute("type", hidden ? "text" : "password");
        this.querySelector("i").className = hidden ? "fas fa-eye-slash" : "fas fa-eye";
    });
}

function validatePassword(pw) {
    const rules = {
        "req-length": pw.length >= 8,
        "req-case": /[a-z]/.test(pw) && /[A-Z]/.test(pw),
        "req-symbols": /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw),
    };

    Object.entries(rules).forEach(([id, ok]) => {
        const el = document.getElementById(id);
        el.querySelector("i").className = ok ? "fas fa-circle-check" : "fas fa-circle-xmark";
        el.classList.toggle("met", ok);
    });

    const input = document.getElementById("password");
    const allOk = Object.values(rules).every(Boolean);
    input.classList.toggle("valid", allOk);
    input.classList.toggle("invalid", !allOk && input.value.length > 0);
    return allOk;
}

makeToggle("togglePassword", "password");
makeToggle("toggleConfirmPassword", "confirmPassword");

document.getElementById("password").addEventListener("input", (e) => validatePassword(e.target.value));

document.getElementById("confirmPassword").addEventListener("input", function () {
    const pw = document.getElementById("password").value;
    this.classList.toggle("valid", this.value.length > 0 && this.value === pw);
    this.classList.toggle("invalid", this.value.length > 0 && this.value !== pw);
});

document.getElementById("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector(".submit-btn");
    const formData = new FormData(e.target);
    const password = formData.get("password") || "";
    const confirmPassword = formData.get("confirmPassword") || "";

    if (!validatePassword(password)) {
        showToast("Password does not meet requirements.");
        return;
    }
    if (password !== confirmPassword) {
        showToast("Passwords don't match.");
        return;
    }

    btn.style.opacity = ".5";
    btn.style.pointerEvents = "none";

    try {
        const response = await fetch(`${GATEWAY_URL}/user-service/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: formData.get("email"),
                fullName: formData.get("fullName"),
                password,
                confirmPassword,
            }),
        });

        const data = await response.json();
        if (response.ok) {
            showToast("Account created! Redirecting…", "success");
            setTimeout(() => (window.location.href = "/login.html"), 1500);
        } else {
            showToast(data.message || "Signup failed");
        }
    } catch (err) {
        showToast("Connection error. Please try again.");
        console.error(err);
    }

    btn.style.opacity = "";
    btn.style.pointerEvents = "";
});