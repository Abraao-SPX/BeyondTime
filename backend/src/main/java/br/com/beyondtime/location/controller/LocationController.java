package br.com.beyondtime.location.controller;

import br.com.beyondtime.location.dto.CityResponse;
import br.com.beyondtime.location.dto.NeighborhoodResponse;
import br.com.beyondtime.location.dto.SafePublicPlaceResponse;
import br.com.beyondtime.location.dto.StateResponse;
import br.com.beyondtime.location.service.LocationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/locations")
public class LocationController {

    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    @GetMapping("/states")
    public ResponseEntity<List<StateResponse>> listStates() {
        return ResponseEntity.ok(locationService.listStates());
    }

    @GetMapping("/cities")
    public ResponseEntity<List<CityResponse>> listCities(
            @RequestParam(name = "uf", required = false) String uf) {
        return ResponseEntity.ok(locationService.listCities(uf));
    }

    @GetMapping("/cities/{cityId}/neighborhoods")
    public ResponseEntity<List<NeighborhoodResponse>> listNeighborhoodsByCity(
            @PathVariable Integer cityId) {
        return ResponseEntity.ok(locationService.listNeighborhoodsByCity(cityId));
    }

    @GetMapping("/safe-places")
    public ResponseEntity<List<SafePublicPlaceResponse>> listSafePublicPlaces(
            @RequestParam(name = "cityId", required = false) Integer cityId) {
        return ResponseEntity.ok(locationService.listSafePublicPlaces(cityId));
    }
}
