package com.inventra.inventra_backend.common.exception;

import com.inventra.inventra_backend.common.domain.exception.DomainException;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final String ERROR_TYPE_BASE = "https://api.inventra.com/errors/";

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ProblemDetail> handleDomainException(DomainException ex, HttpServletRequest request) {
        log.warn("Domain exception occurred at [{}]: [{}] {}", request.getRequestURI(), ex.getErrorCode(), ex.getMessage());

        String sanitizedType = ex.getErrorCode().toLowerCase().replace('_', '-').replaceAll("[^a-z0-9-]", "");
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(ex.getHttpStatus(), ex.getMessage());
        problem.setType(URI.create(ERROR_TYPE_BASE + sanitizedType));
        problem.setTitle(formatTitle(ex.getErrorCode()));
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("errorCode", ex.getErrorCode());
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(ex.getHttpStatus()).body(problem);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
        MethodArgumentNotValidException ex,
        HttpHeaders headers,
        HttpStatusCode status,
        WebRequest request
    ) {
        String requestUri = extractRequestUri(request);
        log.warn("Validation failed for request at [{}]: {} errors", requestUri, ex.getBindingResult().getErrorCount());

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Request validation failed");
        problem.setType(URI.create(ERROR_TYPE_BASE + "validation-failed"));
        problem.setTitle("Validation Failed");
        problem.setInstance(URI.create(requestUri));
        problem.setProperty("errorCode", "VALIDATION_FAILED");
        problem.setProperty("timestamp", Instant.now());

        List<Map<String, Object>> violations = ex.getBindingResult().getFieldErrors().stream()
            .map(error -> Map.<String, Object>of(
                "field", error.getField(),
                "message", error.getDefaultMessage() != null ? error.getDefaultMessage() : "Invalid value",
                "rejectedValue", error.getRejectedValue() != null ? error.getRejectedValue().toString() : "null"
            ))
            .toList();

        problem.setProperty("violations", violations);
        return ResponseEntity.badRequest().body(problem);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
        org.springframework.http.converter.HttpMessageNotReadableException ex,
        HttpHeaders headers,
        HttpStatusCode status,
        WebRequest request
    ) {
        Throwable cause = ex.getCause();
        while (cause != null) {
            if (cause instanceof DomainException domainEx) {
                String requestUri = extractRequestUri(request);
                String sanitizedType = domainEx.getErrorCode().toLowerCase().replace('_', '-').replaceAll("[^a-z0-9-]", "");
                ProblemDetail problem = ProblemDetail.forStatusAndDetail(domainEx.getHttpStatus(), domainEx.getMessage());
                problem.setType(URI.create(ERROR_TYPE_BASE + sanitizedType));
                problem.setTitle(formatTitle(domainEx.getErrorCode()));
                problem.setInstance(URI.create(requestUri));
                problem.setProperty("errorCode", domainEx.getErrorCode());
                problem.setProperty("timestamp", Instant.now());
                return ResponseEntity.status(domainEx.getHttpStatus()).body(problem);
            }
            cause = cause.getCause();
        }
        return super.handleHttpMessageNotReadable(ex, headers, status, request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        log.warn("Access denied at [{}]: {}", request.getRequestURI(), ex.getMessage());

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, "Access to the requested resource is denied");
        problem.setType(URI.create(ERROR_TYPE_BASE + "access-denied"));
        problem.setTitle("Access Denied");
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("errorCode", "ACCESS_DENIED");
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(problem);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ProblemDetail> handleAuthenticationException(AuthenticationException ex, HttpServletRequest request) {
        log.warn("Authentication failure at [{}]: {}", request.getRequestURI(), ex.getMessage());

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "Authentication is required to access this resource");
        problem.setType(URI.create(ERROR_TYPE_BASE + "unauthorized"));
        problem.setTitle("Unauthorized");
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("errorCode", "UNAUTHORIZED");
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(problem);
    }

    @ExceptionHandler({
        org.springframework.dao.OptimisticLockingFailureException.class,
        org.springframework.orm.ObjectOptimisticLockingFailureException.class
    })
    public ResponseEntity<ProblemDetail> handleOptimisticLockingFailure(Exception ex, HttpServletRequest request) {
        log.warn("Optimistic locking conflict at [{}]: {}", request.getRequestURI(), ex.getMessage());

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.CONFLICT,
            "The resource was modified concurrently by another transaction. Please refresh and retry."
        );
        problem.setType(URI.create(ERROR_TYPE_BASE + "concurrent-modification"));
        problem.setTitle("Concurrent Modification");
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("errorCode", "CONCURRENT_MODIFICATION");
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleUnhandledException(Exception ex, HttpServletRequest request) {
        log.error("Unhandled internal server error at [{}]:", request.getRequestURI(), ex);

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "An unexpected internal error occurred. Please contact support."
        );
        problem.setType(URI.create(ERROR_TYPE_BASE + "internal-error"));
        problem.setTitle("Internal Server Error");
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("errorCode", "INTERNAL_SERVER_ERROR");
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problem);
    }

    private String extractRequestUri(WebRequest request) {
        if (request instanceof ServletWebRequest servletWebRequest) {
            return servletWebRequest.getRequest().getRequestURI();
        }
        return "/";
    }

    private String formatTitle(String errorCode) {
        String[] parts = errorCode.split("_");
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (!part.isEmpty()) {
                if (!sb.isEmpty()) {
                    sb.append(" ");
                }
                sb.append(part.substring(0, 1).toUpperCase()).append(part.substring(1).toLowerCase());
            }
        }
        return sb.toString();
    }
}
