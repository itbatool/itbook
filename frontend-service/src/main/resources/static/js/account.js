"use strict";

function switchSection(sectionName) {
    document.querySelectorAll(".settings-section").forEach((s) => s.classList.remove("active"));
    document.querySelectorAll(".settings-btn").forEach((b) => b.classList.remove("active"));
    document.getElementById(sectionName).classList.add("active");
    event.target.closest(".settings-btn").classList.add("active");
}

function updateRequirementState(elementId, isValid) {
    const requirement = document.getElementById(elementId);
    if (!requirement) return;
    const icon = requirement.querySelector("i");
    requirement.classList.toggle("valid", isValid);
    requirement.classList.toggle("invalid", !isValid);
    if (icon) icon.className = isValid ? "fas fa-circle-check" : "fas fa-circle-xmark";
}

function validatePasswordRules(password) {
    const hasLength = password.length >= 8;
    const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
    const hasNumberAndSymbol = /\d/.test(password) && /[^A-Za-z0-9]/.test(password);

    updateRequirementState("reqLength", hasLength);
    updateRequirementState("reqCase", hasMixedCase);
    updateRequirementState("reqSymbols", hasNumberAndSymbol);

    return hasLength && hasMixedCase && hasNumberAndSymbol;
}

async function deleteAccount() {
    if (!confirm("Are you sure? This action cannot be undone.")) return;

    const response = await fetch(`${GATEWAY_URL}/user-service/api/auth/delete-account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
    });

    const data = await response.json();
    if (response.ok) {
        localStorage.clear();
        window.location.href = "/login.html";
    } else {
        showToast(data.error || "Failed to delete account");
    }
}

async function removeAvatar() {
    const response = await fetch(`${GATEWAY_URL}/user-service/api/auth/remove-avatar`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (response.ok) {
        showToast("Photo removed", "success");
        setTimeout(() => window.location.reload(), 1200);
    } else {
        showToast("Failed to remove photo");
    }
}

const newPasswordInput = document.getElementById("newPassword");
if (newPasswordInput) {
    validatePasswordRules(newPasswordInput.value || "");
    newPasswordInput.addEventListener("input", (e) => validatePasswordRules(e.target.value || ""));
}

document.getElementById("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitter = e.submitter;
    const type = submitter.dataset.type;

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();

    const updates = {};

    if (type === "email" && email) {
        updates.email = email;
    }

    if (type === "name" && fullName) {
        updates.fullName = fullName;
    }

    if (Object.keys(updates).length === 0) {
        showToast("Nothing to update.");
        return;
    }

    const response = await fetch(`${GATEWAY_URL}/user-service/api/auth/update`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (response.ok) {
        if (data.token) {
            localStorage.setItem("token", data.token);
        }

        if (updates.fullName) {
            document.getElementById("userName").textContent = updates.fullName;
            document.getElementById("navUserName").textContent = updates.fullName;
        }

        if (updates.email) {
            document.getElementById("userEmail").textContent = updates.email;
        }

        showToast("Updated successfully", "success");
    } else {
        showToast(data.error || "Failed to update");
    }
});

document.querySelector("#password form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!validatePasswordRules(newPassword)) {
        showToast("Password does not meet the required rules.");
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast("New password and confirmation do not match.");
        return;
    }

    const response = await fetch(`${GATEWAY_URL}/user-service/api/auth/change-password`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });

    const data = await response.json();
    if (response.ok) {
        showToast("Password updated successfully", "success");
        document.querySelector("#password form").reset();
        validatePasswordRules("");
    } else {
        showToast(data.error || "Failed to update password");
    }
});