package com.itbook.user_service.controller;

import com.itbook.user_service.client.CourseServiceClient;
import com.itbook.user_service.dto.CourseDto;
import com.itbook.user_service.entity.User;
import com.itbook.user_service.service.UserService;
import com.itbook.user_service.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class UserController {

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private CourseServiceClient coursesServiceClient;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        try {
            String email = credentials.get("email");
            String password = credentials.get("password");

            User user = userService.authenticateUser(email, password);

            if (user != null) {
                String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getFullName());

                Map<String, Object> response = Map.of(
                        "success", true,
                        "token", token,
                        "user", Map.of(
                                "id", user.getId(),
                                "email", user.getEmail(),
                                "name", user.getFullName()
                        )
                );
                return ResponseEntity.ok(response);
            }
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Invalid credentials"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody Map<String, String> data) {
        String email           = data.get("email");
        String fullName        = data.get("fullName");
        String password        = data.get("password");
        String confirmPassword = data.get("confirmPassword");

        ResponseEntity<?> validationError = validatePassword(password);
        if (validationError != null) return validationError;

        if (!password.equals(confirmPassword))
            return ResponseEntity.status(400).body(Map.of("success", false, "message", "Passwords don't match"));

        if (userService.findUserByEmail(email) != null)
            return ResponseEntity.status(400).body(Map.of("success", false, "message", "Email already exists"));

        User newUser = new User();
        newUser.setEmail(email);
        newUser.setFullName(fullName);
        newUser.setPassword(userService.encodePassword(password));
        userService.saveUser(newUser);

        return ResponseEntity.ok(Map.of("success", true, "message", "Account created"));
    }

    @PostMapping("/resetPassword")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> data) {
        String email              = data.get("email");
        String newPassword        = data.get("newPassword");
        String confirmNewPassword = data.get("confirmNewPassword");

        User user = userService.findUserByEmail(email);
        if (user == null)
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "Email not found"));

        ResponseEntity<?> validationError = validatePassword(newPassword);
        if (validationError != null) return validationError;

        if (!newPassword.equals(confirmNewPassword))
            return ResponseEntity.status(400).body(Map.of("success", false, "message", "Passwords don't match"));

        user.setPassword(userService.encodePassword(newPassword));
        userService.saveUser(user);

        return ResponseEntity.ok(Map.of("success", true, "message", "Password reset successfully"));
    }

    @GetMapping("/verify")
    public ResponseEntity<?> verifyToken(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "");
            if (jwtUtil.validateToken(token)) {
                Long userId = jwtUtil.getUserId(token);
                User user = userService.getUserById(userId);

                Map<String, Object> response = new HashMap<>();
                response.put("userId", userId);
                response.put("email", jwtUtil.getEmail(token));
                response.put("name", jwtUtil.getName(token));
                response.put("avatarUrl", user == null ? null : user.getAvatarUrl());

                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid token"));
        }
        return ResponseEntity.status(401).body(Map.of("error", "Invalid token"));
    }

    @PostMapping("/update")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> updates,
                                           @RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "");
            Long userId = jwtUtil.getUserId(token);

            User user = userService.getUserById(userId);
            if (user != null) {
                if (updates.containsKey("fullName")) {
                    user.setFullName(updates.get("fullName"));
                }
                if (updates.containsKey("email")) {
                    user.setEmail(updates.get("email"));
                }
                userService.saveUser(user);

                String newToken = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getFullName());
                return ResponseEntity.ok(Map.of("success", true, "token", newToken));
            }
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid token"));
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> data,
                                            @RequestHeader("Authorization") String authHeader) {
        try {
            String token  = authHeader.replace("Bearer ", "");
            Long userId   = jwtUtil.getUserId(token);
            User user     = userService.getUserById(userId);

            if (user == null)
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));

            String currentPassword  = data.get("currentPassword");
            String newPassword      = data.get("newPassword");
            String confirmPassword  = data.get("confirmPassword");

            if (!userService.checkPassword(currentPassword, user.getPassword()))
                return ResponseEntity.status(400).body(Map.of("error", "Current password is incorrect"));

            ResponseEntity<?> validationError = validatePassword(newPassword);
            if (validationError != null) return validationError;

            if (!newPassword.equals(confirmPassword))
                return ResponseEntity.status(400).body(Map.of("error", "New passwords don't match"));

            user.setPassword(userService.encodePassword(newPassword));
            userService.saveUser(user);

            return ResponseEntity.ok(Map.of("success", true, "message", "Password updated"));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid token"));
        }
    }

    @DeleteMapping("/delete-account")
    public ResponseEntity<?> deleteAccount(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "");
            Long userId = jwtUtil.getUserId(token);

            userService.deleteUser(userId);
            return ResponseEntity.ok(Map.of("success", true, "message", "Account deleted"));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid token"));
        }
    }

    @GetMapping("/avatars/{filename}")
    public ResponseEntity<?> getAvatar(@PathVariable String filename) throws IOException {
        Path filePath = Paths.get(uploadDir).toAbsolutePath().normalize().resolve("avatars").resolve(filename);
        if (!Files.exists(filePath)) {
            return ResponseEntity.notFound().build();
        }

        String contentType = Files.probeContentType(filePath);
        if (contentType == null) {
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        byte[] fileContent = Files.readAllBytes(filePath);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .body(fileContent);
    }
    
    @DeleteMapping("/remove-avatar")
    public ResponseEntity<?> removeAvatar(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "");
            Long userId = jwtUtil.getUserId(token);
            User user = userService.getUserById(userId);
            if (user == null)
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));

            user.setAvatarUrl(null);
            userService.saveUser(user);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid token"));
        }
    }

    @PostMapping("/upload-avatar")
    public ResponseEntity<?> uploadAvatar(@RequestParam("file") MultipartFile file,
                                          @RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "");
            Long userId = jwtUtil.getUserId(token);

            User user = userService.getUserById(userId);
            if (user == null) {
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));
            }

            String originalFilename = file.getOriginalFilename();
            String extension = (originalFilename != null && originalFilename.contains("."))
                    ? originalFilename.substring(originalFilename.lastIndexOf('.'))
                    : ".jpg";

            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize().resolve("avatars");
            Files.createDirectories(uploadPath);

            String filename = userId + "_" + System.currentTimeMillis() + extension;
            Path filePath = uploadPath.resolve(filename);
            file.transferTo(filePath.toFile());

            String avatarUrl = "/user-service/api/auth/avatars/" + filename;
            user.setAvatarUrl(avatarUrl);
            userService.saveUser(user);

            return ResponseEntity.ok(Map.of("success", true, "avatarUrl", avatarUrl));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/internal/users")
    public ResponseEntity<?> getUsersByIds(@RequestParam("ids") String idsParam) {
        List<Long> userIds = parseIds(idsParam);
        if (userIds.isEmpty()) return ResponseEntity.ok(Collections.emptyList());

        List<Map<String, Object>> users = userService.getUsersByIds(userIds)
                .stream()
                .map(u -> Map.<String, Object>of(
                        "id", u.getId(),
                        "email", u.getEmail(),
                        "fullName", u.getFullName(),
                        "avatarUrl", u.getAvatarUrl() == null ? "" : u.getAvatarUrl()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(users);
    }

    @GetMapping("/{userId}/courses")
    public ResponseEntity<?> getUserWithCourses(@PathVariable Long userId) {
        User user = userService.getUserById(userId);
        if (user == null) return ResponseEntity.notFound().build();

        List<CourseDto> courses = coursesServiceClient.getUserCourses(userId);

        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "fullName", user.getFullName(),
                "avatarUrl", user.getAvatarUrl() == null ? "" : user.getAvatarUrl(),
                "courses", courses
        ));
    }

    private List<Long> parseIds(String idsParam) {
        return java.util.Arrays.stream(idsParam.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(Long::valueOf)
                .collect(Collectors.toList());
    }

    private ResponseEntity<?> validatePassword(String password) {
        if (password == null || password.length() < 8)
            return ResponseEntity.badRequest().body(Map.of("message", "Password must be at least 8 characters"));
        if (!password.matches(".*[a-z].*") || !password.matches(".*[A-Z].*"))
            return ResponseEntity.badRequest().body(Map.of("message", "Password must contain uppercase and lowercase"));
        if (!password.matches(".*\\d.*") || !password.matches(".*[^A-Za-z0-9].*"))
            return ResponseEntity.badRequest().body(Map.of("message", "Password must contain numbers and symbols"));
        return null;
    }
}