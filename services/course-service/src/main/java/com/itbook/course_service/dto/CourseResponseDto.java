package com.itbook.course_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourseResponseDto {
    private Long id;
    private String title;
    private String description;
    private String image;
    private String bookUrl;
    private String slidesUrl;
    private Integer students;
    private List<UserBasicDto> studentsList;
}