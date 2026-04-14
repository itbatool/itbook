package com.itbook.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserBasicDto {
    private Long userId;
    private String email;
    private String name;
    private String avatarUrl;
}