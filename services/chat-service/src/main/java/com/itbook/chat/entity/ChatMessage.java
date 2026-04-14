package com.itbook.chat.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Long courseId;

    @Enumerated(EnumType.STRING)
    private Type type;

    @Column(columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime timestamp;

    @Column(columnDefinition = "TIMESTAMP")
    private LocalDateTime editedAt;

    @Column(columnDefinition = "JSON")
    private String reactions;

    @Column(columnDefinition = "TIMESTAMP")
    private LocalDateTime deletedAt;

    @Builder.Default
    private Boolean isDeleted = false;

    private String content;

    private String originalContent;
}