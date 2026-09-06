package com.inventra.inventra_backend.common.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.MediaType;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class OptimisticLockingExceptionHandlerTest {

    private MockMvc mockMvc;

    @RestController
    static class TestLockController {
        @GetMapping("/test/optimistic-lock-error")
        public void throwOptimisticLockError() {
            throw new OptimisticLockingFailureException("Simulated optimistic lock version collision on entity");
        }

        @GetMapping("/test/object-optimistic-lock-error")
        public void throwObjectOptimisticLockError() {
            throw new ObjectOptimisticLockingFailureException("Product", "Simulated Hibernate version collision");
        }
    }

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new TestLockController())
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    }

    @Test
    @DisplayName("OptimisticLockingFailureException returns 409 Conflict with CONCURRENT_MODIFICATION error code")
    void testOptimisticLockingFailureReturns409() throws Exception {
        mockMvc.perform(get("/test/optimistic-lock-error")
                .accept(MediaType.APPLICATION_PROBLEM_JSON, MediaType.APPLICATION_JSON))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.status").value(409))
            .andExpect(jsonPath("$.errorCode").value("CONCURRENT_MODIFICATION"))
            .andExpect(jsonPath("$.title").value("Concurrent Modification"))
            .andExpect(jsonPath("$.detail").value("The resource was modified concurrently by another transaction. Please refresh and retry."));
    }

    @Test
    @DisplayName("ObjectOptimisticLockingFailureException returns 409 Conflict with CONCURRENT_MODIFICATION error code")
    void testObjectOptimisticLockingFailureReturns409() throws Exception {
        mockMvc.perform(get("/test/object-optimistic-lock-error")
                .accept(MediaType.APPLICATION_PROBLEM_JSON, MediaType.APPLICATION_JSON))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.status").value(409))
            .andExpect(jsonPath("$.errorCode").value("CONCURRENT_MODIFICATION"))
            .andExpect(jsonPath("$.title").value("Concurrent Modification"))
            .andExpect(jsonPath("$.detail").value("The resource was modified concurrently by another transaction. Please refresh and retry."));
    }
}
