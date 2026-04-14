package com.itbook.chat.controller;

import com.itbook.chat.entity.ChatMessage;
import com.itbook.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;
@Controller
@RequiredArgsConstructor

public class ChatController {
    private final ChatService chatService;
    private final SimpMessageSendingOperations messagingTemplate;

    @MessageMapping("/chat.addUser")
    public void addUser(@Payload ChatMessage chatMessage,
                        SimpMessageHeaderAccessor accessor) {

        ChatMessage joinMsg = chatService.handleJoin(chatMessage, accessor);
        if (joinMsg == null) {
            sendError(accessor, "Unauthorized or not enrolled");
            return;
        }
        messagingTemplate.convertAndSend("/topic/course/" + joinMsg.getCourseId(), joinMsg);
    }

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor accessor) {
        ChatMessage saved = chatService.prepareMessage(chatMessage, accessor);
        if (saved != null)
            messagingTemplate.convertAndSend("/topic/course/" + saved.getCourseId(), saved);
    }

    @MessageMapping("/chat.editMessage")
    public void editMessage(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor accessor) {
        Long userId = (Long) accessor.getSessionAttributes().get("userId");
        ChatMessage updated = chatService.editMessage(chatMessage.getId(), chatMessage.getContent(), userId);
        if (updated != null)
            messagingTemplate.convertAndSend("/topic/course/" + updated.getCourseId(), updated);
    }

    @MessageMapping("/chat.deleteMessage")
    public void deleteMessage(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor accessor) {
        Long userId = (Long) accessor.getSessionAttributes().get("userId");
        ChatMessage updated = chatService.deleteMessage(chatMessage.getId(), userId);
        if (updated != null)
            messagingTemplate.convertAndSend("/topic/course/" + updated.getCourseId(), updated);
    }

    @MessageMapping("/chat.addReaction")
    public void addReaction(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor accessor) {
        Long userId = (Long) accessor.getSessionAttributes().get("userId");
        if (userId == null)
            return;
        ChatMessage updated = chatService.addReaction(chatMessage.getId(), chatMessage.getOriginalContent(), userId);
        if (updated != null)
            messagingTemplate.convertAndSend("/topic/course/" + updated.getCourseId(), updated);
    }

    @MessageMapping("/chat.removeReaction")
    public void removeReaction(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor accessor) {
        Long userId = (Long) accessor.getSessionAttributes().get("userId");
        if (userId == null)
            return;
        ChatMessage updated = chatService.removeReaction(chatMessage.getId(), chatMessage.getOriginalContent(), userId);
        if (updated != null)
            messagingTemplate.convertAndSend("/topic/course/" + updated.getCourseId(), updated);
    }

    private void sendError(SimpMessageHeaderAccessor accessor, String message) {
        messagingTemplate.convertAndSendToUser(accessor.getSessionId(), "/queue/errors", message);
    }
}