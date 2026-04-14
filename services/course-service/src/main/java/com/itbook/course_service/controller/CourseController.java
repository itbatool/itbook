package com.itbook.course_service.controller;

import com.itbook.course_service.dto.CourseResponseDto;
import com.itbook.course_service.dto.UserBasicDto;
import com.itbook.course_service.entity.Enrollment;
import com.itbook.course_service.service.CourseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {
    private final CourseService courseService;

    @GetMapping
    public ResponseEntity<List<CourseResponseDto>> getAllCourses(
            @RequestParam(defaultValue = "false") boolean withStudents) {
        return ResponseEntity.ok(courseService.getAllCourses(withStudents));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CourseResponseDto> getCourseById(
            @PathVariable Long id, @RequestParam(defaultValue = "false") boolean withStudents) {
        return courseService.getCourseById(id, withStudents)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{courseId}/enroll/{userId}")
    public ResponseEntity<String> enrollUser(@PathVariable Long courseId, @PathVariable Long userId,
                                             @RequestHeader(value = "Authorization") String authHeader) {
        if (courseService.getCourseEntityById(courseId).isEmpty())
            return ResponseEntity.notFound().build();

        Long tokenUserId = courseService.getUserIdFromToken(authHeader);
        if (tokenUserId == null)
            return ResponseEntity.status(401).body("Invalid token");
        if (!tokenUserId.equals(userId))
            return ResponseEntity.status(403).body("You can only enroll yourself");
        if (!courseService.userExists(userId))
            return ResponseEntity.badRequest().body("User not found");

        return courseService.enrollUser(userId, courseId) ? ResponseEntity.ok("Successfully enrolled")
                : ResponseEntity.badRequest().body("Already enrolled");
    }

    @GetMapping("/{courseId}/enrolled/{userId}")
    public ResponseEntity<Boolean> isEnrolled(@PathVariable Long courseId, @PathVariable Long userId) {
        return ResponseEntity.ok(courseService.isEnrolled(userId, courseId));
    }

    @DeleteMapping("/{courseId}/unenroll/{userId}")
    public ResponseEntity<String> unenrollUser(@PathVariable Long courseId, @PathVariable Long userId) {
        if (courseService.getCourseEntityById(courseId).isEmpty())
            return ResponseEntity.notFound().build();
        return courseService.unenrollUser(userId, courseId) ? ResponseEntity.ok("Successfully unenrolled")
                : ResponseEntity.badRequest().body("Not enrolled");
    }

    @GetMapping("/user/{userId}/enrolled")
    public ResponseEntity<List<Enrollment>> getUserEnrollments(@PathVariable Long userId) {
        if (!courseService.userExists(userId))
            return ResponseEntity.ok(Collections.emptyList());
        return ResponseEntity.ok(courseService.getUserEnrollments(userId));
    }

    @GetMapping("/user/{userId}/courses")
    public ResponseEntity<List<CourseResponseDto>> getUserCourses(
            @PathVariable Long userId, @RequestParam(defaultValue = "false") boolean withStudents) {
        if (!courseService.userExists(userId))
            return ResponseEntity.ok(Collections.emptyList());
        return ResponseEntity.ok(courseService.getCoursesByUserId(userId, withStudents));
    }

    @GetMapping("/{courseId}/users")
    public ResponseEntity<List<UserBasicDto>> getCourseUsers(@PathVariable Long courseId) {
        return ResponseEntity.ok(courseService.getCourseStudents(courseId));
    }

    @GetMapping("/{courseId}/students")
    public ResponseEntity<List<UserBasicDto>> getCourseStudents(@PathVariable Long courseId) {
        return ResponseEntity.ok(courseService.getCourseStudents(courseId));
    }

    @PostMapping("/user/{userId}/course/{courseId}/first-join")
    public ResponseEntity<Boolean> checkAndMarkFirstJoin(@PathVariable Long userId, @PathVariable Long courseId) {
        return ResponseEntity.ok(courseService.checkAndMarkFirstJoin(userId, courseId));
    }
}