package com.itbook.chat.controller;

import com.itbook.chat.dto.UserBasicDto;
import com.itbook.chat.entity.ChatMessage;
import com.itbook.chat.repository.ChatMessageRepository;
import com.itbook.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatHistoryController {
    private final ChatService chatService;
    private final SimpMessageSendingOperations messagingTemplate;
    private final ChatMessageRepository chatMessageRepository;

    @GetMapping("/course/{courseId}/history")
    public ResponseEntity<List<ChatMessage>> getHistory(
            @PathVariable Long courseId, @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        UserBasicDto user = chatService.verifyAndGetUser(token);
        if (user == null)
            return ResponseEntity.status(401).build();

        if (!chatService.isEnrolled(user.getUserId(), courseId)) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(chatService.getCourseHistory(courseId));
    }

    @PostMapping("/course/{courseId}/leave")
    public ResponseEntity<?> leave(@PathVariable Long courseId, @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        UserBasicDto user = chatService.verifyAndGetUser(token);
        if (user == null)
            return ResponseEntity.status(401).build();

        ChatMessage leaveMsg = chatService.buildLeaveMessage(user.getUserId(), courseId);
        chatMessageRepository.save(leaveMsg);
        messagingTemplate.convertAndSend("/topic/course/" + courseId, leaveMsg);
        return ResponseEntity.ok().build();
    }
}