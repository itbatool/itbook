package com.itbook.course_service.dto;

import lombok.Data;

@Data
public class UserBasicDto {
    private Long id;
    private String email;
    private String fullName;
    private String avatarUrl;
}