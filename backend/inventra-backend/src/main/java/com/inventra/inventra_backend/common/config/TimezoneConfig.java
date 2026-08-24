package com.inventra.inventra_backend.common.config;

import jakarta.annotation.PostConstruct;
import java.time.Clock;
import java.time.ZoneId;
import java.util.TimeZone;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TimezoneConfig {

    public static final String CANONICAL_TIMEZONE = "Asia/Kolkata";

    @Value("${app.timezone:Asia/Kolkata}")
    private String timezone;

    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone(timezone));
    }

    @Bean
    public ZoneId applicationZoneId() {
        return ZoneId.of(timezone);
    }

    @Bean
    public Clock clock(ZoneId applicationZoneId) {
        return Clock.system(applicationZoneId);
    }
}
