package com.inventra.inventra_backend.careers.application;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.careers.api.dto.CreateJobRequest;
import com.inventra.inventra_backend.careers.api.dto.JobApplicationResponse;
import com.inventra.inventra_backend.careers.api.dto.JobResponse;
import com.inventra.inventra_backend.careers.api.dto.SubmitApplicationRequest;
import com.inventra.inventra_backend.careers.api.dto.UpdateApplicationStatusRequest;
import com.inventra.inventra_backend.careers.api.dto.UpdateJobRequest;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.inventra.inventra_backend.common.mail.application.EmailService;

@Service
public class CareerService {

    private static final Logger log = LoggerFactory.getLogger(CareerService.class);

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final EmailService emailService;

    public CareerService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper, EmailService emailService) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.emailService = emailService;
    }

    // ── Public APIs ──────────────────────────────────────────────────────────

    public List<JobResponse> getActiveJobs() {
        String sql = "SELECT * FROM career_jobs WHERE active = true ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, this::mapRowToJobResponse);
    }

    public JobResponse getJobById(UUID id) {
        String sql = "SELECT * FROM career_jobs WHERE id = ?";
        List<JobResponse> list = jdbcTemplate.query(sql, this::mapRowToJobResponse, id);
        if (list.isEmpty()) {
            throw new ResourceNotFoundException("CareerJob", id.toString());
        }
        return list.get(0);
    }

    @Transactional
    public JobApplicationResponse submitApplication(UUID jobId, SubmitApplicationRequest req) {
        JobResponse job = getJobById(jobId);
        if (!job.active()) {
            throw new BusinessRuleViolationException("JOB_INACTIVE", "This position is no longer accepting new applications.");
        }

        UUID applicationId = UUID.randomUUID();
        String sql = """
            INSERT INTO job_applications (
                id, job_id, job_title, full_name, email, phone, current_location, linkedin_url, portfolio_url,
                experience_years, current_company, current_role_title, notice_period_days, current_ctc, expected_ctc,
                resume_url, cover_letter, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """;

        jdbcTemplate.update(
            sql,
            applicationId,
            jobId,
            job.title(),
            req.fullName().trim(),
            req.email().trim().toLowerCase(),
            req.phone().trim(),
            req.currentLocation().trim(),
            req.linkedinUrl() != null ? req.linkedinUrl().trim() : null,
            req.portfolioUrl() != null ? req.portfolioUrl().trim() : null,
            req.experienceYears(),
            req.currentCompany() != null ? req.currentCompany().trim() : null,
            req.currentRole() != null ? req.currentRole().trim() : null,
            req.noticePeriodDays(),
            req.currentCtc() != null ? req.currentCtc().trim() : null,
            req.expectedCtc() != null ? req.expectedCtc().trim() : null,
            req.resumeUrl().trim(),
            req.coverLetter() != null ? req.coverLetter().trim() : null
        );

        log.info("Application {} submitted by {} for job {}", applicationId, req.email(), job.title());
        return getApplicationById(applicationId);
    }

    // ── Admin APIs ───────────────────────────────────────────────────────────

    public List<JobResponse> getAllJobs() {
        String sql = "SELECT * FROM career_jobs ORDER BY created_at DESC";
        return jdbcTemplate.query(sql, this::mapRowToJobResponse);
    }

    @Transactional
    public JobResponse createJob(CreateJobRequest req) {
        UUID id = UUID.randomUUID();
        String sql = """
            INSERT INTO career_jobs (
                id, title, department, location, employment_type, experience_level, salary_range,
                summary, description, responsibilities, requirements, benefits, active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?::jsonb, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """;

        String respJson = toJson(req.responsibilities() != null ? req.responsibilities() : List.of());
        String reqsJson = toJson(req.requirements() != null ? req.requirements() : List.of());
        String bensJson = toJson(req.benefits() != null ? req.benefits() : List.of());

        jdbcTemplate.update(
            sql,
            id,
            req.title().trim(),
            req.department().trim(),
            req.location().trim(),
            req.employmentType() != null ? req.employmentType().trim() : "Full-time",
            req.experienceLevel().trim(),
            req.salaryRange() != null ? req.salaryRange().trim() : null,
            req.summary().trim(),
            req.description().trim(),
            respJson,
            reqsJson,
            bensJson,
            req.active() != null ? req.active() : true
        );

        log.info("Admin created career job: {} ({})", req.title(), id);
        return getJobById(id);
    }

    @Transactional
    public JobResponse updateJob(UUID id, UpdateJobRequest req) {
        // Ensure exists
        getJobById(id);

        String sql = """
            UPDATE career_jobs SET
                title = ?,
                department = ?,
                location = ?,
                employment_type = ?,
                experience_level = ?,
                salary_range = ?,
                summary = ?,
                description = ?,
                responsibilities = ?::jsonb,
                requirements = ?::jsonb,
                benefits = ?::jsonb,
                active = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """;

        String respJson = toJson(req.responsibilities() != null ? req.responsibilities() : List.of());
        String reqsJson = toJson(req.requirements() != null ? req.requirements() : List.of());
        String bensJson = toJson(req.benefits() != null ? req.benefits() : List.of());

        jdbcTemplate.update(
            sql,
            req.title().trim(),
            req.department().trim(),
            req.location().trim(),
            req.employmentType() != null ? req.employmentType().trim() : "Full-time",
            req.experienceLevel().trim(),
            req.salaryRange() != null ? req.salaryRange().trim() : null,
            req.summary().trim(),
            req.description().trim(),
            respJson,
            reqsJson,
            bensJson,
            req.active() != null ? req.active() : true,
            id
        );

        log.info("Admin updated career job: {} ({})", req.title(), id);
        return getJobById(id);
    }

    @Transactional
    public void deleteJob(UUID id) {
        getJobById(id);
        jdbcTemplate.update("DELETE FROM career_jobs WHERE id = ?", id);
        log.info("Admin deleted career job: {}", id);
    }

    public List<JobApplicationResponse> getApplications(UUID jobId, String status, String search) {
        StringBuilder sql = new StringBuilder("SELECT * FROM job_applications WHERE 1=1 ");
        List<Object> params = new ArrayList<>();

        if (jobId != null) {
            sql.append("AND job_id = ? ");
            params.add(jobId);
        }

        if (status != null && !status.isBlank()) {
            sql.append("AND UPPER(status) = ? ");
            params.add(status.trim().toUpperCase());
        }

        if (search != null && !search.isBlank()) {
            String term = "%" + search.trim().toLowerCase() + "%";
            sql.append("AND (LOWER(full_name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(job_title) LIKE ?) ");
            params.add(term);
            params.add(term);
            params.add(term);
        }

        sql.append("ORDER BY created_at DESC");
        return jdbcTemplate.query(sql.toString(), this::mapRowToApplicationResponse, params.toArray());
    }

    public JobApplicationResponse getApplicationById(UUID id) {
        String sql = "SELECT * FROM job_applications WHERE id = ?";
        List<JobApplicationResponse> list = jdbcTemplate.query(sql, this::mapRowToApplicationResponse, id);
        if (list.isEmpty()) {
            throw new ResourceNotFoundException("JobApplication", id.toString());
        }
        return list.get(0);
    }

    @Transactional
    public JobApplicationResponse updateApplicationStatus(UUID id, UpdateApplicationStatusRequest req) {
        getApplicationById(id);

        String sql = "UPDATE job_applications SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        jdbcTemplate.update(sql, req.status().trim().toUpperCase(), req.adminNotes(), id);

        log.info("Admin updated application {} status to '{}'", id, req.status().toUpperCase());
        JobApplicationResponse updated = getApplicationById(id);

        try {
            emailService.sendApplicationStatusUpdate(
                updated.email(),
                updated.fullName(),
                updated.jobTitle(),
                updated.status(),
                updated.adminNotes()
            );
            log.info("Dispatched application status email to candidate {}", updated.email());
        } catch (Exception e) {
            log.error("Failed to send candidate status update email to {}: {}", updated.email(), e.getMessage());
        }

        return updated;
    }

    // ── Row Mappers & Helpers ────────────────────────────────────────────────

    private JobResponse mapRowToJobResponse(ResultSet rs, int rowNum) throws SQLException {
        List<String> resp = fromJsonList(rs.getString("responsibilities"));
        List<String> reqs = fromJsonList(rs.getString("requirements"));
        List<String> bens = fromJsonList(rs.getString("benefits"));

        return new JobResponse(
            UUID.fromString(rs.getString("id")),
            rs.getString("title"),
            rs.getString("department"),
            rs.getString("location"),
            rs.getString("employment_type"),
            rs.getString("experience_level"),
            rs.getString("salary_range"),
            rs.getString("summary"),
            rs.getString("description"),
            resp,
            reqs,
            bens,
            rs.getBoolean("active"),
            rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toInstant() : Instant.now(),
            rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toInstant() : Instant.now()
        );
    }

    private JobApplicationResponse mapRowToApplicationResponse(ResultSet rs, int rowNum) throws SQLException {
        return new JobApplicationResponse(
            UUID.fromString(rs.getString("id")),
            UUID.fromString(rs.getString("job_id")),
            rs.getString("job_title"),
            rs.getString("full_name"),
            rs.getString("email"),
            rs.getString("phone"),
            rs.getString("current_location"),
            rs.getString("linkedin_url"),
            rs.getString("portfolio_url"),
            rs.getBigDecimal("experience_years"),
            rs.getString("current_company"),
            rs.getString("current_role_title"),
            rs.getObject("notice_period_days") != null ? rs.getInt("notice_period_days") : null,
            rs.getString("current_ctc"),
            rs.getString("expected_ctc"),
            rs.getString("resume_url"),
            rs.getString("cover_letter"),
            rs.getString("status"),
            rs.getString("admin_notes"),
            rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toInstant() : Instant.now(),
            rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toInstant() : Instant.now()
        );
    }

    private String toJson(List<String> list) {
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            log.warn("Failed to serialize string list to JSON: {}", e.getMessage());
            return "[]";
        }
    }

    private List<String> fromJsonList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse JSON string list: {}", e.getMessage());
            return List.of();
        }
    }
}
