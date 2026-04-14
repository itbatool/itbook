"use strict";

const courseId = new URLSearchParams(window.location.search).get("id");

let currentCourse = null;
let isUserEnrolled = false;

function showLoading() {
    document.getElementById("loadingIndicator").style.display = "flex";
    document.getElementById("courseHeader").style.display = "none";
    document.getElementById("courseContainer").style.display = "none";
    document.getElementById("errorMessage").style.display = "none";
}

function showError() {
    document.getElementById("loadingIndicator").style.display = "none";
    document.getElementById("courseHeader").style.display = "none";
    document.getElementById("courseContainer").style.display = "none";
    document.getElementById("errorMessage").style.display = "flex";
}

function switchTab(tabName) {
    document.querySelectorAll(".tab-content").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll(".tab-nav-btn").forEach((btn) => btn.classList.remove("active"));
    document.getElementById(tabName).classList.add("active");

    const clickedButton = window.event?.target?.closest(".tab-nav-btn");
    if (clickedButton) clickedButton.classList.add("active");
}

function renderStudents(students) {
    const studentsList = document.getElementById("studentsList");
    if (!studentsList) return;

    if (!students.length) {
        studentsList.innerHTML = '<li class="student-list-empty">No students enrolled yet.</li>';
        return;
    }

    studentsList.innerHTML = students
        .map((student) => {
            const displayName = student.fullName || student.email || `User ${student.id}`;
            const initials = (displayName.trim().charAt(0) || "U").toUpperCase();
            const avatarHtml = student.avatarUrl ?
                `<img src="${GATEWAY_URL}${student.avatarUrl}" alt="${displayName}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">` :
                `<div class="student-avatar">${initials}</div>`;
            return `
            <li class="student-item">
                ${avatarHtml}
                <div class="student-info">
                    <strong>${displayName}</strong>
                </div>
            </li>
        `;
        })
        .join("");
}

function displayCourse(course) {
    document.getElementById("courseTitle").textContent = course.title;
    document.getElementById("courseDesc").textContent = course.description;
    document.getElementById("courseStudents").textContent = course.students || 0;
    document.getElementById("overviewDesc").textContent = course.description;

    const heroBackground = document.getElementById("heroBackground");
    if (course.image && heroBackground) heroBackground.style.backgroundImage = `url('/img/courses/${course.image}')`;

    if (course.bookUrl) document.getElementById("bookFrame").src = course.bookUrl;
    if (course.slidesUrl) document.getElementById("slidesFrame").src = course.slidesUrl;

    document.getElementById("loadingIndicator").style.display = "none";
    document.getElementById("courseHeader").style.display = "block";
    document.getElementById("courseContainer").style.display = "block";
    document.getElementById("errorMessage").style.display = "none";
}

function openCourseChat() {
    if (!isUserEnrolled) {
        showToast("You must be enrolled to access the course chat.");
        return;
    }
    window.location.href = "/chat.html?courseId=" + currentCourse.id;
}

async function loadEnrolledStudents(courseIdValue) {
    try {
        const response = await fetch(`${GATEWAY_URL}/course-service/api/courses/${courseIdValue}/students`);
        if (!response.ok) throw new Error("Failed to fetch students");
        renderStudents(await response.json());
    } catch (error) {
        console.error("Error loading enrolled students:", error);
        renderStudents([]);
    }
}

async function checkEnrollmentStatus(courseIdValue) {
    const token = getToken();
    const user = getUser();

    if (!token || !user?.id) {
        window.location.href = "/login.html";
        return;
    }

    try {
        const response = await fetch(
            `${GATEWAY_URL}/course-service/api/courses/${courseIdValue}/enrolled/${user.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                },
            }
        );

        if (!response.ok) throw new Error("Failed to check enrollment");

        isUserEnrolled = await response.json();

        if (!isUserEnrolled) {
            window.location.href = "/courses.html?msg=not-enrolled";
        }
    } catch (error) {
        console.error("Error checking enrollment:", error);
        window.location.href = "/courses.html";
    }
}

async function loadCourse() {
    if (!courseId) {
        showError();
        return;
    }

    showLoading();

    try {
        const response = await fetch(`${GATEWAY_URL}/course-service/api/courses/${courseId}`);
        if (!response.ok) throw new Error("Course not found");

        currentCourse = await response.json();
        await checkEnrollmentStatus(currentCourse.id);
        displayCourse(currentCourse);
        await loadEnrolledStudents(currentCourse.id);
    } catch (error) {
        console.error("Error loading course:", error);
        showError();
    }
}

async function unenrollCourse() {
    if (!confirm("Are you sure you want to unenroll from this course?")) return;

    try {
        const res = await fetch(
            `${GATEWAY_URL}/course-service/api/courses/${currentCourse.id}/unenroll/${getUser().id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${getToken()}`
                },
            }
        );

        if (res.ok) {
            await fetch(`${GATEWAY_URL}/chat-service/api/chat/course/${currentCourse.id}/leave`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${getToken()}`
                }
            });
            showToast("Successfully unenrolled", "success");
            setTimeout(() => (window.location.href = "/courses.html"), 1500);
        } else {
            showToast((await res.text()) || "Failed to unenroll");
        }
    } catch (e) {
        console.error(e);
        showToast("An error occurred");
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadCourse);
} else {
    loadCourse();
}