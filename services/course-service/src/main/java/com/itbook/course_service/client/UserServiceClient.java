package com.itbook.course_service.client;

import com.itbook.course_service.dto.UserBasicDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

@FeignClient(name = "user-service")
public interface UserServiceClient {
    @GetMapping("/api/auth/internal/users") List<UserBasicDto> getUsersByIds(@RequestParam("ids") String ids);

    @GetMapping("/api/auth/verify") Map<String, Object> verifyToken(@RequestHeader("Authorization") String authHeader);
}