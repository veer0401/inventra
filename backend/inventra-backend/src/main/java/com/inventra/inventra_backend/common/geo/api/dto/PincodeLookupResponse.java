package com.inventra.inventra_backend.common.geo.api.dto;

import java.util.List;

public record PincodeLookupResponse(
    String pincode,
    String city,
    String state,
    String district,
    List<String> postOffices,
    boolean found,
    String message
) {
    public static PincodeLookupResponse success(
        String pincode,
        String city,
        String state,
        String district,
        List<String> postOffices
    ) {
        return new PincodeLookupResponse(pincode, city, state, district, postOffices, true, "PIN code resolved successfully");
    }

    public static PincodeLookupResponse notFound(String pincode, String message) {
        return new PincodeLookupResponse(pincode, null, null, null, List.of(), false, message);
    }
}
