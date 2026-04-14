package com.itbook.chat.repository;

import com.itbook.chat.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByUserId(Long userId);
    List<ChatMessage> findByCourseIdOrderByTimestampAsc(Long courseId);
}