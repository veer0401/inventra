package com.inventra.inventra_backend.common.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(
        HttpServletRequest request,
        HttpServletResponse response,
        AuthenticationException authException
    ) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);

        String json = """
            {
              "type": "https://api.inventra.com/errors/unauthorized",
              "title": "Unauthorized",
              "status": 401,
              "detail": "Full authentication is required to access this resource",
              "instance": "%s",
              "errorCode": "UNAUTHORIZED",
              "timestamp": "%s"
            }
            """.formatted(request.getRequestURI(), Instant.now());

        response.getWriter().write(json);
    }
}
