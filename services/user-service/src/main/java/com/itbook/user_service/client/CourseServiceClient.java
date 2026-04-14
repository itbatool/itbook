package com.itbook.user_service.client;

import com.itbook.user_service.dto.CourseDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.List;

@FeignClient(name = "course-service")
public interface CourseServiceClient {

    @GetMapping("/api/courses/user/{userId}/courses")
    List<CourseDto> getUserCourses(@PathVariable("userId") Long userId);
}