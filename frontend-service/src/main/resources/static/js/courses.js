"use strict";

let courses = [];
let enrolledCourseIds = new Set();

function isMyCoursesView() {
    return new URLSearchParams(window.location.search).get("view") === "my";
}

function updateCoursesHeader() {
    const titleElement = document.querySelector(".section-title");
    const subtitleElement = document.querySelector(".section-subtitle");
    if (!titleElement || !subtitleElement) return;

    if (isMyCoursesView()) {
        titleElement.textContent = "My Courses";
        subtitleElement.textContent = "Courses you are enrolled in";
    } else {
        titleElement.textContent = "Explore Courses";
        subtitleElement.textContent = "Find the perfect course to advance your career";
    }
}

function goToCourse(courseId) {
    window.location.href = `/course-detail.html?id=${courseId}`;
}

function displayCourses(coursesToDisplay) {
    const grid = document.getElementById("coursesGrid");
    grid.innerHTML = "";

    if (coursesToDisplay.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <p>${isMyCoursesView() ? "You are not enrolled in any courses yet." : "No courses found matching your search."}</p>
            </div>`;
        return;
    }

    coursesToDisplay.forEach((course, index) => {
        const isEnrolled = enrolledCourseIds.has(course.id);
        const card = document.createElement("div");
        card.className = "course-card";
        card.style.animationDelay = `${index * 0.1}s`;

        const actionButton = isEnrolled
            ? `<button class="enroll-btn enrolled-btn" onclick="goToCourse(${course.id}); event.stopPropagation();">
                   <span>Continue</span>
                   <i class="fas fa-check"></i>
               </button>`
            : `<button class="enroll-btn" onclick="enrollCourse(event, ${course.id})">
                   <span>Enroll</span>
                   <i class="fas fa-arrow-right"></i>
               </button>`;

        card.innerHTML = `
            <div class="course-card-inner">
                <div class="course-image">
                    <img src="/img/courses/${course.image}" alt="${course.title}" onerror="this.style.display='none'">
                    <div class="course-overlay">
                        <button class="quick-view-btn" onclick="goToCourse(${course.id}); event.stopPropagation();">
                            <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                    ${isEnrolled ? '<div class="enrolled-badge"><i class="fas fa-check"></i> Enrolled</div>' : ""}
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
                        ${actionButton}
                    </div>
                </div>
            </div>
        `;

        card.onclick = (e) => {
            if (!e.target.closest(".enroll-btn") && !e.target.closest(".quick-view-btn")) {
                goToCourse(course.id);
            }
        };

        grid.appendChild(card);
    });
}

async function loadEnrolledIds() {
    const token = getToken();
    const user = getUser();
    if (!token || !user?.id) return;

    try {
        const res = await fetch(`${GATEWAY_URL}/course-service/api/courses/user/${user.id}/courses`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            const enrolled = await res.json();
            enrolledCourseIds = new Set(enrolled.map((c) => c.id));
        }
    } catch (e) {
        console.error("Failed to load enrolled courses", e);
    }
}

async function enrollCourse(event, courseId) {
    event.stopPropagation();

    const token = getToken();
    const user = getUser();

    if (!token || !user?.id) {
        window.location.href = "/login.html";
        return;
    }

    try {
        const res = await fetch(`${GATEWAY_URL}/course-service/api/courses/${courseId}/enroll/${user.id}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        });
        const message = await res.text();

        if (!res.ok && !message.toLowerCase().includes("already enrolled")) {
            showToast(message || "Failed to enroll");
            return;
        }

        enrolledCourseIds.add(courseId);
        displayCourses(courses);
        goToCourse(courseId);
    } catch (error) {
        console.error("Error enrolling:", error);
        showToast("Failed to enroll");
    }
}

async function loadCourses() {
    updateCoursesHeader();

    const token = getToken();
    const user = getUser();
    const myView = isMyCoursesView();

    if (myView && (!token || !user?.id)) {
        window.location.href = "/login.html";
        return;
    }

    const endpoint = myView
        ? `${GATEWAY_URL}/course-service/api/courses/user/${user.id}/courses`
        : `${GATEWAY_URL}/course-service/api/courses`;

    try {
        await loadEnrolledIds();

        const res = await fetch(
            endpoint,
            token
                ? {
                      headers: { Authorization: `Bearer ${token}` },
                  }
                : {}
        );

        if (!res.ok) throw new Error("Failed to fetch courses");

        courses = await res.json();
        document.getElementById("loading").style.display = "none";
        displayCourses(courses);
    } catch (error) {
        console.error("Error loading courses:", error);
        document.getElementById("loading").innerHTML =
            '<div class="error-state"><i class="fas fa-exclamation-circle"></i><p>Failed to load courses. Please try again later.</p></div>';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("msg") === "not-enrolled") {
        window.history.replaceState({}, "", "/courses.html");
        setTimeout(() => showToast("You must be enrolled to access this course."), 300);
    }

    document.getElementById("searchInput").addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = courses.filter(
            (c) => c.title.toLowerCase().includes(query) || c.description.toLowerCase().includes(query)
        );
        displayCourses(filtered);
    });

    loadCourses();
});