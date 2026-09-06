package com.inventra.inventra_backend.common.geo.api;

import com.inventra.inventra_backend.common.geo.api.dto.PincodeLookupResponse;
import com.inventra.inventra_backend.common.geo.application.PincodeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pincode")
public class PincodeController {

    private final PincodeService pincodeService;

    public PincodeController(PincodeService pincodeService) {
        this.pincodeService = pincodeService;
    }

    @GetMapping("/{pincode}")
    public ResponseEntity<PincodeLookupResponse> lookupPincode(@PathVariable String pincode) {
        PincodeLookupResponse response = pincodeService.lookup(pincode);
        return ResponseEntity.ok(response);
    }
}
