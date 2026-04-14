package com.itbook.chat.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;

@FeignClient(name = "course-service")
public interface CourseServiceClient {
    @GetMapping("/api/courses/{courseId}/enrolled/{userId}")
    Boolean isEnrolled(@PathVariable("userId") Long userId, @PathVariable("courseId") Long courseId);

    @PostMapping("/api/courses/user/{userId}/course/{courseId}/first-join")
    Boolean checkAndMarkFirstJoin(@PathVariable("userId") Long userId, @PathVariable("courseId") Long courseId);
}