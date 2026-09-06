package com.inventra.inventra_backend.common.geo.api;

import com.inventra.inventra_backend.common.geo.application.GeoService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/geo")
public class GeoController {

    private final GeoService geoService;

    public GeoController(GeoService geoService) {
        this.geoService = geoService;
    }

    @GetMapping("/states")
    public ResponseEntity<List<String>> getStates() {
        return ResponseEntity.ok(geoService.getStates());
    }

    @GetMapping("/cities")
    public ResponseEntity<List<String>> getCities(@RequestParam(required = false) String state) {
        return ResponseEntity.ok(geoService.getCities(state));
    }
}
