"use strict";

let allCourses = [];

function displayCourses(list) {
    const grid = document.getElementById("coursesGrid");
    grid.innerHTML = "";

    if (list.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <p>You are not enrolled in any courses yet.</p>
                <a href="/courses.html" style="margin-top:1rem; display:inline-block; padding:0.6rem 1.5rem;
                   background:#4a63c8; color:white; border-radius:8px; text-decoration:none;">
                   Browse Courses
                </a>
            </div>`;
        return;
    }

    list.forEach((course, index) => {
        const card = document.createElement("div");
        card.className = "course-card";
        card.style.animationDelay = `${index * 0.1}s`;
        card.innerHTML = `
            <div class="course-card-inner">
                <div class="course-image">
                    <img src="/img/courses/${course.image}" alt="${course.title}" onerror="this.style.display='none'">
                    <div class="course-overlay">
                        <button class="quick-view-btn" onclick="window.location.href='/course-detail.html?id=${course.id}'">
                            <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
                <div class="course-content">
                    <div class="course-header">
                        <span class="course-category">Computer Science</span>
                        <div class="course-rating">
                            <i class="fas fa-star"></i>
                            <span>4.8</span>
                        </div>
                    </div>
                    <h3 class="course-title">${course.title}</h3>
                    <p class="course-description">${course.description}</p>
                    <div class="course-footer">
                        <div class="course-meta">
                            <div class="meta-item">
                                <i class="fas fa-users"></i>
                                <span>${course.students}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-clock"></i>
                                <span>12 weeks</span>
                            </div>
                        </div>
                        <button class="enroll-btn unenroll-btn" onclick="unenrollCourse(event, ${course.id})">
                            <span>Unenroll</span>
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        card.onclick = (e) => {
            if (!e.target.closest(".unenroll-btn") && !e.target.closest(".quick-view-btn"))
                window.location.href = `/course-detail.html?id=${course.id}`;
        };
        grid.appendChild(card);
    });
}

function updateEnrolledCount() {
    const count = allCourses.length;
    const el = document.getElementById("enrolledCount");
    if (el)
        el.textContent =
            count === 0
                ? "You are not enrolled in any courses yet"
                : `You are enrolled in ${count} course${count > 1 ? "s" : ""}`;

    const statEl = document.getElementById("statEnrolled");
    if (statEl) statEl.textContent = count;
}

async function unenrollCourse(event, courseId) {
    event.stopPropagation();
    if (!confirm("Are you sure you want to unenroll from this course?")) return;

    try {
        const res = await fetch(`${GATEWAY_URL}/course-service/api/courses/${courseId}/unenroll/${getUser().id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${getToken()}` },
        });

        if (res.ok) {
            allCourses = allCourses.filter((c) => c.id !== courseId);
            updateEnrolledCount();
            displayCourses(allCourses);
        } else {
            showToast((await res.text()) || "Failed to unenroll");
        }
    } catch (e) {
        console.error(e);
        showToast("An error occurred");
    }
}

async function loadMyCourses() {
    const token = getToken();
    const user = getUser();

    if (!token || !user?.id) {
        window.location.href = "/login.html";
        return;
    }

    try {
        const res = await fetch(`${GATEWAY_URL}/course-service/api/courses/user/${user.id}/courses`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch");

        allCourses = await res.json();
        document.getElementById("loading").style.display = "none";
        updateEnrolledCount();
        displayCourses(allCourses);
    } catch (e) {
        console.error(e);
        document.getElementById("loading").innerHTML =
            '<div class="error-state"><i class="fas fa-exclamation-circle"></i><p>Failed to load your courses.</p></div>';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("searchInput").addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        displayCourses(
            allCourses.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
        );
    });

    loadMyCourses();
});