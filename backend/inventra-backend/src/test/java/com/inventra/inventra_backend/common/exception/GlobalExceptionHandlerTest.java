package com.inventra.inventra_backend.common.exception;

import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("handleDomainException maps ResourceNotFoundException to RFC 9457 ProblemDetail")
    void testHandleResourceNotFoundException() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/test-resources/123");

        ResourceNotFoundException ex = ResourceNotFoundException.forResource("Resource", "123");
        ProblemDetail problem = handler.handleDomainException(ex, request).getBody();

        assertThat(problem).isNotNull();
        assertThat(problem.getStatus()).isEqualTo(HttpStatus.NOT_FOUND.value());
        assertThat(problem.getTitle()).isEqualTo("Resource Not Found");
        assertThat(problem.getDetail()).isEqualTo("Resource not found with identifier: 123");
        assertThat(problem.getProperties()).containsEntry("errorCode", "RESOURCE_NOT_FOUND");
        assertThat(problem.getProperties()).containsKey("timestamp");
        assertThat(problem.getInstance()).hasToString("/api/v1/test-resources/123");
        assertThat(problem.getType()).hasToString("https://api.inventra.com/errors/resource-not-found");
    }

    @Test
    @DisplayName("handleAccessDenied maps to 403 ProblemDetail")
    void testHandleAccessDenied() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/admin/settings");

        AccessDeniedException ex = new AccessDeniedException("Forbidden");
        ProblemDetail problem = handler.handleAccessDenied(ex, request).getBody();

        assertThat(problem).isNotNull();
        assertThat(problem.getStatus()).isEqualTo(HttpStatus.FORBIDDEN.value());
        assertThat(problem.getTitle()).isEqualTo("Access Denied");
        assertThat(problem.getProperties()).containsEntry("errorCode", "ACCESS_DENIED");
    }

    @Test
    @DisplayName("handleAuthenticationException maps to 401 ProblemDetail")
    void testHandleAuthenticationException() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/profile");

        AuthenticationException ex = new AuthenticationException("Bad credentials") {};
        ProblemDetail problem = handler.handleAuthenticationException(ex, request).getBody();

        assertThat(problem).isNotNull();
        assertThat(problem.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(problem.getTitle()).isEqualTo("Unauthorized");
        assertThat(problem.getProperties()).containsEntry("errorCode", "UNAUTHORIZED");
    }

    @Test
    @DisplayName("handleUnhandledException masks internal exception details in 500 ProblemDetail")
    void testHandleUnhandledException() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/crash");

        RuntimeException ex = new RuntimeException("Sensitive database connection password: secret123");
        ProblemDetail problem = handler.handleUnhandledException(ex, request).getBody();

        assertThat(problem).isNotNull();
        assertThat(problem.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR.value());
        assertThat(problem.getTitle()).isEqualTo("Internal Server Error");
        assertThat(problem.getDetail()).doesNotContain("secret123");
        assertThat(problem.getProperties()).containsEntry("errorCode", "INTERNAL_SERVER_ERROR");
    }
}
