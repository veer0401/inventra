package com.inventra.inventra_backend.common.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

@Component
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    @Override
    public void handle(
        HttpServletRequest request,
        HttpServletResponse response,
        AccessDeniedException accessDeniedException
    ) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);

        String json = """
            {
              "type": "https://api.inventra.com/errors/access-denied",
              "title": "Access Denied",
              "status": 403,
              "detail": "You do not have permission to access this resource",
              "instance": "%s",
              "errorCode": "ACCESS_DENIED",
              "timestamp": "%s"
            }
            """.formatted(request.getRequestURI(), Instant.now());

        response.getWriter().write(json);
    }
}
