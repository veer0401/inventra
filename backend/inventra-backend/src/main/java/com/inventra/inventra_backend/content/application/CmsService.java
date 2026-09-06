package com.inventra.inventra_backend.content.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.content.api.dto.CmsPageResponse;
import com.inventra.inventra_backend.content.api.dto.UpdateCmsPageRequest;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CmsService {

    private static final Logger log = LoggerFactory.getLogger(CmsService.class);

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public CmsService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public CmsPageResponse getPageContent(String pageKey) {
        String normalizedKey = pageKey.toUpperCase();
        List<CmsPageResponse> pages = jdbcTemplate.query(
            "SELECT page_key, title, subtitle, content_data, updated_at, updated_by FROM platform_cms_pages WHERE page_key = ?",
            (rs, rowNum) -> {
                String key = rs.getString("page_key");
                String title = rs.getString("title");
                String subtitle = rs.getString("subtitle");
                String rawJson = rs.getString("content_data");
                Timestamp ts = rs.getTimestamp("updated_at");
                String updatedBy = rs.getString("updated_by");

                Object contentNode;
                try {
                    contentNode = rawJson != null ? objectMapper.readValue(rawJson, Object.class) : java.util.Map.of();
                } catch (Exception e) {
                    contentNode = java.util.Map.of();
                }

                return new CmsPageResponse(
                    key,
                    title,
                    subtitle,
                    contentNode,
                    ts != null ? ts.toInstant() : Instant.now(),
                    updatedBy != null ? updatedBy : "System"
                );
            },
            normalizedKey
        );

        if (pages.isEmpty()) {
            throw new ResourceNotFoundException("CmsPage", pageKey);
        }

        return pages.get(0);
    }

    public List<CmsPageResponse> getAllPages() {
        return jdbcTemplate.query(
            "SELECT page_key, title, subtitle, content_data, updated_at, updated_by FROM platform_cms_pages ORDER BY page_key ASC",
            (rs, rowNum) -> {
                String key = rs.getString("page_key");
                String title = rs.getString("title");
                String subtitle = rs.getString("subtitle");
                String rawJson = rs.getString("content_data");
                Timestamp ts = rs.getTimestamp("updated_at");
                String updatedBy = rs.getString("updated_by");

                Object contentNode;
                try {
                    contentNode = rawJson != null ? objectMapper.readValue(rawJson, Object.class) : java.util.Map.of();
                } catch (Exception e) {
                    contentNode = java.util.Map.of();
                }

                return new CmsPageResponse(
                    key,
                    title,
                    subtitle,
                    contentNode,
                    ts != null ? ts.toInstant() : Instant.now(),
                    updatedBy != null ? updatedBy : "System"
                );
            }
        );
    }

    @Transactional
    public CmsPageResponse updatePageContent(String pageKey, UpdateCmsPageRequest request, String updatedBy) {
        String normalizedKey = pageKey.toUpperCase();
        String jsonString;
        try {
            jsonString = objectMapper.writeValueAsString(request.contentData());
        } catch (Exception e) {
            jsonString = "{}";
        }

        int rows = jdbcTemplate.update("""
            INSERT INTO platform_cms_pages (page_key, title, subtitle, content_data, updated_at, updated_by)
            VALUES (?, ?, ?, ?::jsonb, CURRENT_TIMESTAMP, ?)
            ON CONFLICT (page_key) DO UPDATE SET
                title = EXCLUDED.title,
                subtitle = EXCLUDED.subtitle,
                content_data = EXCLUDED.content_data,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = EXCLUDED.updated_by
            """,
            normalizedKey,
            request.title(),
            request.subtitle(),
            jsonString,
            updatedBy != null ? updatedBy : "Platform Admin"
        );

        log.info("Updated CMS page {} (rows affected: {}) by {}", normalizedKey, rows, updatedBy);
        return getPageContent(normalizedKey);
    }
}
