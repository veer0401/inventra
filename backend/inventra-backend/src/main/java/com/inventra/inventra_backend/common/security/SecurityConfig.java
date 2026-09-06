package com.inventra.inventra_backend.common.security;

import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final RestAuthenticationEntryPoint authenticationEntryPoint;
    private final RestAccessDeniedHandler accessDeniedHandler;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final String allowedOriginsStr;

    public SecurityConfig(
        RestAuthenticationEntryPoint authenticationEntryPoint,
        RestAccessDeniedHandler accessDeniedHandler,
        JwtAuthenticationFilter jwtAuthenticationFilter,
        @Value("${app.cors.allowed-origins:}") String allowedOriginsStr
    ) {
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.allowedOriginsStr = allowedOriginsStr;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(authenticationEntryPoint)
                .accessDeniedHandler(accessDeniedHandler)
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/actuator/health",
                    "/actuator/info",
                    "/error"
                ).permitAll()
                .requestMatchers(
                    org.springframework.http.HttpMethod.OPTIONS,
                    "/**"
                ).permitAll()
                .requestMatchers(
                    org.springframework.http.HttpMethod.POST,
                    "/api/v1/onboarding/apply",
                    "/api/v1/auth/onboarding/activate",
                    "/api/v1/auth/invite/activate",
                    "/api/v1/auth/login",
                    "/api/v1/auth/refresh",
                    "/api/v1/auth/password/reset-request",
                    "/api/v1/auth/password/reset-confirm",
                    "/api/v1/public/**"
                ).permitAll()
                .requestMatchers(
                    org.springframework.http.HttpMethod.GET,
                    "/api/v1/pincode/**",
                    "/api/v1/geo/**",
                    "/api/v1/onboarding/check-availability",
                    "/api/v1/auth/invite/**",
                    "/api/v1/subscription/pricing/public",
                    "/api/v1/public/**"
                ).permitAll()
                .requestMatchers("/api/v1/admin/**").hasRole("PLATFORM_ADMIN")
                .requestMatchers("/api/v1/**").authenticated()
                .anyRequest().permitAll()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        if (allowedOriginsStr != null && !allowedOriginsStr.isBlank()) {
            List<String> origins = Arrays.stream(allowedOriginsStr.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
            configuration.setAllowedOrigins(origins);
        } else {
            configuration.setAllowedOrigins(List.of());
        }

        configuration.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS", "HEAD"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization", "Content-Disposition"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
