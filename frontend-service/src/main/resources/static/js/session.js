"use strict";

const DEFAULT_GATEWAY_URL = `${window.location.protocol}//localhost:8765`;
const GATEWAY_URL = localStorage.getItem("gatewayUrl") || DEFAULT_GATEWAY_URL;

let currentSessionUser = null;

function getToken() {
    return localStorage.getItem("token");
}

function getUser() {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
}

function showToast(message, type = "error") {
    document.querySelector(".itb-toast")?.remove();

    const container =
        document.querySelector(".card-body") ||
        document.querySelector(".main-content") ||
        document.querySelector(".account-container") ||
        document.body;

    const toast = document.createElement("div");
    toast.className = `itb-toast itb-toast--${type}`;
    toast.innerHTML = `<i class="fas fa-${type === "error" ? "circle-xmark" : "circle-check"}"></i> ${message}`;
    container.prepend(toast);

    requestAnimationFrame(() => toast.classList.add("itb-toast--visible"));
    setTimeout(() => {
        toast.classList.remove("itb-toast--visible");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

async function checkAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    try {
        const response = await fetch(`${GATEWAY_URL}/user-service/api/auth/verify`, {
            headers: {
                Authorization: "Bearer " + token
            },
        });

        if (response.ok) {
            const user = await response.json();
            currentSessionUser = user;

            if (document.getElementById("navUserName")) document.getElementById("navUserName").textContent = user.name;
            if (document.getElementById("userName")) document.getElementById("userName").textContent = user.name;
            if (document.getElementById("userEmail")) document.getElementById("userEmail").textContent = user.email;

            const navAvatar = document.getElementById("navUserAvatar");
            if (navAvatar) {
                if (user.avatarUrl) {
                    navAvatar.style.background = "transparent";
                    navAvatar.style.border = "none";
                    navAvatar.innerHTML = `<img src="${GATEWAY_URL}${user.avatarUrl}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:var(--r);">`;
                } else if (user.name) {
                    navAvatar.style.background = "";
                    navAvatar.style.border = "";
                    navAvatar.textContent = user.name.charAt(0).toUpperCase();
                } else {
                    navAvatar.style.background = "";
                    navAvatar.style.border = "";
                    navAvatar.textContent = "U";
                }
            }

            if (document.getElementById("avatarDisplay")) {
                if (user.avatarUrl) {
                    document.getElementById("avatarDisplay").innerHTML =
                        `<img src="${GATEWAY_URL}${user.avatarUrl}" alt="Avatar">`;
                } else {
                    document.getElementById("avatarDisplay").innerHTML = `<i class="fas fa-user"></i>`;
                }
                const removeBtn = document.getElementById("removeAvatarBtn");
                if (removeBtn) {
                    removeBtn.style.display = user.avatarUrl ? "block" : "none";
                }
            }

            document.body.style.display = "block";
        } else {
            localStorage.clear();
            window.location.href = "/login.html";
        }
    } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.clear();
        window.location.href = "/login.html";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const avatarUpload = document.getElementById("avatarUpload");
    if (avatarUpload) {
        avatarUpload.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append("file", file);

            const token = getToken();
            const response = await fetch(`${GATEWAY_URL}/user-service/api/auth/upload-avatar`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData,
            });

            const data = await response.json();
            if (response.ok) {
                showToast("Avatar updated", "success");
                setTimeout(() => window.location.reload(), 1200);
            } else {
                showToast(data.error || "Upload failed");
            }
        });
    }

    const currentPage = window.location.pathname.split("/").pop();
    const publicPages = ["login.html", "signUp.html", "resetPassword.html", "index.html", ""];

    if (!publicPages.includes(currentPage)) {
        document.body.style.display = "none";
        checkAuth();
    }
});

function logout() {
    localStorage.clear();
    window.location.href = "/login.html";
}