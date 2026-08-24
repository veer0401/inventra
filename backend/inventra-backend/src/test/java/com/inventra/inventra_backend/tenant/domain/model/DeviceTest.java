package com.inventra.inventra_backend.tenant.domain.model;

import com.inventra.inventra_backend.common.util.UuidUtils;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DeviceTest {

    @Test
    @DisplayName("Device creation normalizes device code to uppercase and assigns UUIDv7")
    void testDeviceCreation() {
        UUID businessId = UuidUtils.newUuid7();
        UUID userId = UuidUtils.newUuid7();

        Device device = Device.create(
            businessId,
            userId,
            "Front Billing Counter",
            "pos-01",
            DeviceType.DESKTOP,
            "Windows 11",
            "1.0.0"
        );

        assertThat(device.getId()).isNotNull();
        assertThat(device.getId().version()).isEqualTo(7);
        assertThat(device.getBusinessId()).isEqualTo(businessId);
        assertThat(device.getUserId()).isEqualTo(userId);
        assertThat(device.getDeviceName()).isEqualTo("Front Billing Counter");
        assertThat(device.getDeviceCode()).isEqualTo("POS-01");
        assertThat(device.getDeviceType()).isEqualTo(DeviceType.DESKTOP);
        assertThat(device.getStatus()).isEqualTo(DeviceStatus.ACTIVE);
        assertThat(device.isActive()).isTrue();
    }

    @Test
    @DisplayName("Device activity and revocation transitions")
    void testDeviceRevocation() {
        Device device = Device.create(
            UuidUtils.newUuid7(),
            UuidUtils.newUuid7(),
            "Counter",
            "POS-02",
            DeviceType.ANDROID,
            "Android 14",
            "1.0.0"
        );

        device.recordActivity("192.168.1.50");
        assertThat(device.getLastIpAddress()).isEqualTo("192.168.1.50");

        device.revoke();
        assertThat(device.getStatus()).isEqualTo(DeviceStatus.REVOKED);
        assertThat(device.isActive()).isFalse();
        assertThat(device.getRevokedAt()).isNotNull();
    }
}
