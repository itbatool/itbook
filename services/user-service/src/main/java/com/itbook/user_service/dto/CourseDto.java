package com.itbook.user_service.dto;

import lombok.Data;

@Data
public class CourseDto {
    private Long id;
    private String title;
    private String description;
    private String image;
    private Integer students;
    private String bookUrl;
    private String slidesUrl;
}