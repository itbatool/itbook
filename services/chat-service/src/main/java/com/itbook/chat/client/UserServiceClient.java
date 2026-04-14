package com.itbook.chat.client;

import com.itbook.chat.dto.UserBasicDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "user-service")
public interface UserServiceClient {

    @GetMapping("/api/auth/verify")
    UserBasicDto verifyToken(@RequestHeader("Authorization") String token);
}