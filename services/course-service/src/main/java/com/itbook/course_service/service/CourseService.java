package com.itbook.course_service.service;

import com.itbook.course_service.client.UserServiceClient;
import com.itbook.course_service.dto.CourseResponseDto;
import com.itbook.course_service.dto.UserBasicDto;
import com.itbook.course_service.entity.Course;
import com.itbook.course_service.entity.Enrollment;
import com.itbook.course_service.repository.CourseRepository;
import com.itbook.course_service.repository.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseService {
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserServiceClient userServiceClient;

    // ── Conversion ────────────────────────────────────────────────

    public CourseResponseDto toDto(Course course) {
        return toDto(course, false);
    }

    public CourseResponseDto toDto(Course course, boolean withStudents) {
        int count = (int) enrollmentRepository.countByCourseId(course.getId());
        List<UserBasicDto> studentsList = withStudents ? getCourseStudents(course.getId()) : null;

        return new CourseResponseDto(course.getId(), course.getTitle(), course.getDescription(), course.getImage(),
                course.getBookUrl(), course.getSlidesUrl(), count, studentsList);
    }

    public List<CourseResponseDto> toDtoList(List<Course> courses, boolean withStudents) {
        return courses.stream().map(c -> toDto(c, withStudents)).collect(Collectors.toList());
    }

    // ── Courses ───────────────────────────────────────────────────

    public List<CourseResponseDto> getAllCourses(boolean withStudents) {
        return toDtoList(courseRepository.findAll(), withStudents);
    }

    public Optional<CourseResponseDto> getCourseById(Long id, boolean withStudents) {
        return courseRepository.findById(id).map(c -> toDto(c, withStudents));
    }

    public Optional<Course> getCourseEntityById(Long id) {
        return courseRepository.findById(id);
    }

    public Course saveCourse(Course course) {
        return courseRepository.save(course);
    }

    public void deleteCourse(Long id) {
        courseRepository.deleteById(id);
    }

    // ── Enrollment ────────────────────────────────────────────────

    public boolean isEnrolled(Long userId, Long courseId) {
        return enrollmentRepository.existsByUserIdAndCourseId(userId, courseId);
    }

    public boolean enrollUser(Long userId, Long courseId) {
        if (isEnrolled(userId, courseId))
            return false;

        Course course = courseRepository.findById(courseId).orElse(null);
        if (course == null)
            return false;

        Enrollment enrollment = new Enrollment();
        enrollment.setUserId(userId);
        enrollment.setCourse(course);
        enrollmentRepository.save(enrollment);
        return true;
    }

    public boolean unenrollUser(Long userId, Long courseId) {
        if (!enrollmentRepository.existsByUserIdAndCourseId(userId, courseId))
            return false;
        enrollmentRepository.deleteByUserIdAndCourseId(userId, courseId);
        return true;
    }

    public List<Enrollment> getUserEnrollments(Long userId) {
        return enrollmentRepository.findByUserId(userId);
    }

    public List<Enrollment> getCourseEnrollments(Long courseId) {
        return enrollmentRepository.findByCourseId(courseId);
    }

    public List<CourseResponseDto> getCoursesByUserId(Long userId, boolean withStudents) {
        List<Enrollment> enrollments = enrollmentRepository.findByUserId(userId);
        return enrollments.stream().map(e -> toDto(e.getCourse(), withStudents)).collect(Collectors.toList());
    }

    public boolean checkAndMarkFirstJoin(Long userId, Long courseId) {
        return enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                .map(enrollment -> {
                    if (!enrollment.getJoinedChat()) {
                        enrollment.setJoinedChat(true);
                        enrollmentRepository.save(enrollment);
                        return true;
                    }
                    return false;
                })
                .orElse(false);
    }

    // ── Users ─────────────────────────────────────────────────────

    public List<UserBasicDto> getUsersByIds(List<Long> userIds) {
        if (userIds.isEmpty())
            return Collections.emptyList();
        try {
            String ids = userIds.stream().map(String::valueOf).collect(Collectors.joining(","));
            return userServiceClient.getUsersByIds(ids);
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public boolean userExists(Long userId) {
        List<UserBasicDto> users = getUsersByIds(List.of(userId));
        return users.stream().anyMatch(u -> userId.equals(u.getId()));
    }

    public Long getUserIdFromToken(String authHeader) {
        try {
            Map<String, Object> response = userServiceClient.verifyToken(authHeader);
            Object userId = response.get("userId");
            if (userId instanceof Number number)
                return number.longValue();
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    public List<UserBasicDto> getCourseStudents(Long courseId) {
        List<Enrollment> enrollments = getCourseEnrollments(courseId);
        if (enrollments.isEmpty())
            return Collections.emptyList();

        List<Long> userIds = enrollments.stream().map(Enrollment::getUserId).distinct().collect(Collectors.toList());

        return getUsersByIds(userIds);
    }
}