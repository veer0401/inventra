package com.inventra.inventra_backend.common.util;

import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UuidUtilsTest {

    @Test
    @DisplayName("UuidUtils.newUuid7() must generate RFC 9562 UUID version 7")
    void testUuidVersionIsSeven() {
        UUID uuid = UuidUtils.newUuid7();

        assertThat(uuid).isNotNull();
        assertThat(uuid.version())
            .as("Generated UUID must have version 7")
            .isEqualTo(7);
        assertThat(uuid.variant())
            .as("Generated UUID must be RFC 4122 / RFC 9562 compliant (variant 2)")
            .isEqualTo(2);
    }

    @Test
    @DisplayName("Consecutively generated UUIDv7s should be distinct and time-ordered")
    void testUuidMonotonicity() {
        UUID id1 = UuidUtils.newUuid7();
        UUID id2 = UuidUtils.newUuid7();
        UUID id3 = UuidUtils.newUuid7();

        assertThat(id1).isNotEqualTo(id2);
        assertThat(id2).isNotEqualTo(id3);

        assertThat(id1.compareTo(id2)).isLessThanOrEqualTo(0);
        assertThat(id2.compareTo(id3)).isLessThanOrEqualTo(0);
    }
}
