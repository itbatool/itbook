"use strict";

const GATEWAY_URL = localStorage.getItem("gatewayUrl") || `${window.location.protocol}//localhost:8765`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

document.getElementById("togglePassword").addEventListener("click", function () {
    const inp = document.getElementById("password");
    const hidden = inp.getAttribute("type") === "password";
    inp.setAttribute("type", hidden ? "text" : "password");
    this.querySelector("i").className = hidden ? "fas fa-eye-slash" : "fas fa-eye";
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector(".submit-btn");
    const formData = new FormData(e.target);
    const payload = JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
    });

    btn.style.opacity = ".5";
    btn.style.pointerEvents = "none";

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch(`${GATEWAY_URL}/user-service/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: payload,
            });

            const data = await response.json();
            const ok = Boolean(data.success) || (response.ok && Boolean(data.token));

            if (ok) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                window.location.href = "/index.html";
                return;
            }

            const notReady = response.status === 503 || /service not found/i.test(data.message || "");
            if (notReady && attempt < 3) {
                await sleep(1200);
                continue;
            }

            showToast(data.message || "Login failed");
            break;
        } catch (err) {
            if (attempt < 3) {
                await sleep(1200);
                continue;
            }
            showToast("Connection error. Please try again.");
            console.error(err);
        }
    }

    btn.style.opacity = "";
    btn.style.pointerEvents = "";
});