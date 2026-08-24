package com.inventra.inventra_backend.common.api;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import static org.assertj.core.api.Assertions.assertThat;

class ApiResponseTest {

    @Test
    @DisplayName("ApiResponse.ok(data) creates successful response with timestamp")
    void testApiResponseOkWithData() {
        ApiResponse<String> response = ApiResponse.ok("Hello Inventra");

        assertThat(response.success()).isTrue();
        assertThat(response.data()).isEqualTo("Hello Inventra");
        assertThat(response.timestamp()).isNotNull();
    }

    @Test
    @DisplayName("ApiResponse.ok() creates successful void response")
    void testApiResponseOkVoid() {
        ApiResponse<Void> response = ApiResponse.ok();

        assertThat(response.success()).isTrue();
        assertThat(response.data()).isNull();
        assertThat(response.timestamp()).isNotNull();
    }

    @Test
    @DisplayName("PageResponse.from(page) extracts pagination metadata accurately")
    void testPageResponseFrom() {
        List<String> items = List.of("Item A", "Item B", "Item C");
        Page<String> page = new PageImpl<>(items, PageRequest.of(0, 10), 30);

        PageResponse<String> response = PageResponse.from(page);

        assertThat(response.content()).containsExactly("Item A", "Item B", "Item C");
        assertThat(response.page()).isEqualTo(0);
        assertThat(response.size()).isEqualTo(10);
        assertThat(response.totalElements()).isEqualTo(30);
        assertThat(response.totalPages()).isEqualTo(3);
        assertThat(response.first()).isTrue();
        assertThat(response.last()).isFalse();
        assertThat(response.hasNext()).isTrue();
        assertThat(response.hasPrevious()).isFalse();
    }
}
