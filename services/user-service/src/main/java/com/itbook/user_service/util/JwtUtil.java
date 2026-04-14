package com.itbook.user_service.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtUtil {

    private final Key key;
    private final long EXPIRATION_TIME = 86400000; // 24 hours

    public JwtUtil(@Value("${app.jwt.secret}") String secret) {
        String normalizedSecret = secret.length() < 32
                ? String.format("%-32s", secret).replace(' ', '0')
                : secret;
        this.key = Keys.hmacShaKeyFor(normalizedSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(Long userId, String email, String name) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("email", email);
        claims.put("name", name);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(key)
                .compact();
    }

    public Claims extractClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public boolean validateToken(String token) {
        try {
            extractClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public Long getUserId(String token) {
        Object rawUserId = extractClaims(token).get("userId");

        if (rawUserId instanceof Number number) {
            return number.longValue();
        }

        if (rawUserId instanceof String value) {
            return Long.parseLong(value);
        }

        throw new IllegalArgumentException("Invalid userId claim type");
    }

    public String getEmail(String token) {
        return extractClaims(token).get("email", String.class);
    }

    public String getName(String token) {
        return extractClaims(token).get("name", String.class);
    }
}