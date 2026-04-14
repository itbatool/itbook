package com.itbook.chat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itbook.chat.client.CourseServiceClient;
import com.itbook.chat.client.UserServiceClient;
import com.itbook.chat.dto.UserBasicDto;
import com.itbook.chat.entity.ChatMessage;
import com.itbook.chat.entity.Type;
import com.itbook.chat.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ChatService {
    private final ChatMessageRepository chatMessageRepository;
    private final UserServiceClient userServiceClient;
    private final CourseServiceClient courseServiceClient;
    private final ObjectMapper objectMapper;

    public UserBasicDto verifyAndGetUser(String token) {
        return userServiceClient.verifyToken(token);
    }

    public boolean isEnrolled(Long userId, Long courseId) {
        return courseServiceClient.isEnrolled(userId, courseId);
    }

    public List<ChatMessage> getCourseHistory(Long courseId) {
        return chatMessageRepository.findByCourseIdOrderByTimestampAsc(courseId);
    }

    public ChatMessage saveMessage(ChatMessage message) {
        return chatMessageRepository.save(message);
    }

    public ChatMessage getMessageById(Long id) {
        return chatMessageRepository.findById(id).orElse(null);
    }

    public ChatMessage handleJoin(ChatMessage chatMessage, SimpMessageHeaderAccessor accessor) {
        String token = chatMessage.getContent();
        Long courseId = chatMessage.getCourseId();

        UserBasicDto user = verifyAndGetUser(token);
        if (user == null)
            return null;
        if (!isEnrolled(user.getUserId(), courseId))
            return null;

        if (accessor.getSessionAttributes() == null) {
            accessor.setSessionAttributes(new java.util.HashMap<>());
        }

        accessor.getSessionAttributes().put("userId", user.getUserId());
        accessor.getSessionAttributes().put("courseId", courseId);

        boolean isFirstJoin = courseServiceClient.checkAndMarkFirstJoin(user.getUserId(), courseId);

        if (isFirstJoin) {
            ChatMessage joinMsg = ChatMessage.builder()
                    .type(Type.JOIN)
                    .userId(user.getUserId())
                    .courseId(courseId)
                    .reactions("{}")
                    .timestamp(LocalDateTime.now())
                    .build();
            return chatMessageRepository.save(joinMsg);
        }

        return ChatMessage.builder()
                .type(Type.JOIN)
                .userId(user.getUserId())
                .courseId(courseId)
                .reactions("{}")
                .timestamp(LocalDateTime.now())
                .build();
    }

    public ChatMessage prepareMessage(ChatMessage chatMessage, SimpMessageHeaderAccessor accessor) {
        Long userId = (Long) accessor.getSessionAttributes().get("userId");

        if (userId == null)
            return null;

        chatMessage.setUserId(userId);
        chatMessage.setReactions("{}");
        chatMessage.setIsDeleted(false);
        chatMessage.setTimestamp(LocalDateTime.now());

        return saveMessage(chatMessage);
    }

    public ChatMessage editMessage(Long messageId, String newContent, Long userId) {
        ChatMessage existing = getMessageById(messageId);
        if (existing == null || !existing.getUserId().equals(userId))
            return null;

        existing.setOriginalContent(existing.getContent());
        existing.setContent(newContent);
        existing.setEditedAt(LocalDateTime.now());
        return chatMessageRepository.save(existing);
    }

    public ChatMessage deleteMessage(Long messageId, Long userId) {
        ChatMessage existing = getMessageById(messageId);
        if (existing == null || !existing.getUserId().equals(userId))
            return null;

        existing.setIsDeleted(true);
        existing.setDeletedAt(LocalDateTime.now());
        existing.setContent("This message was deleted");
        return chatMessageRepository.save(existing);
    }

    public ChatMessage addReaction(Long messageId, String emoji, Long userId) {
        ChatMessage existing = getMessageById(messageId);
        if (existing == null)
            return null;

        try {
            Map<String, List<String>> reactions =
                    objectMapper.readValue(existing.getReactions() == null ? "{}" : existing.getReactions(),
                            new com.fasterxml.jackson.core.type.TypeReference<>() {});
            reactions.computeIfAbsent(emoji, k -> new java.util.ArrayList<>());
            String reactionUserId = String.valueOf(userId);
            if (!reactions.get(emoji).contains(reactionUserId)) {
                reactions.get(emoji).add(reactionUserId);
            }
            existing.setReactions(objectMapper.writeValueAsString(reactions));
            return chatMessageRepository.save(existing);
        } catch (Exception e) {
            return null;
        }
    }

    public ChatMessage removeReaction(Long messageId, String emoji, Long userId) {
        ChatMessage existing = getMessageById(messageId);
        if (existing == null)
            return null;

        try {
            Map<String, List<String>> reactions =
                    objectMapper.readValue(existing.getReactions() == null ? "{}" : existing.getReactions(),
                            new com.fasterxml.jackson.core.type.TypeReference<>() {});
            if (reactions.containsKey(emoji)) {
                reactions.get(emoji).remove(String.valueOf(userId));
                if (reactions.get(emoji).isEmpty())
                    reactions.remove(emoji);
            }
            existing.setReactions(objectMapper.writeValueAsString(reactions));
            return chatMessageRepository.save(existing);
        } catch (Exception e) {
            return null;
        }
    }

    public ChatMessage buildLeaveMessage(Long userId, Long courseId) {
        return ChatMessage.builder()
                .type(Type.LEAVE)
                .userId(userId)
                .courseId(courseId)
                .reactions("{}")
                .timestamp(LocalDateTime.now())
                .build();
    }
}