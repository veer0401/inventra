package com.inventra.inventra_backend.common.util;

import com.github.f4b6a3.uuid.UuidCreator;
import java.util.UUID;

public final class UuidUtils {

    private UuidUtils() {
    }

    /**
     * Generates a time-ordered UUIDv7 (RFC 9562).
     *
     * @return a new UUID version 7
     */
    public static UUID newUuid7() {
        return UuidCreator.getTimeOrderedEpoch();
    }
}
