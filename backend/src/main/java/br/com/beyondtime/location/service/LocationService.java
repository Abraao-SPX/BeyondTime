package br.com.beyondtime.location.service;

import br.com.beyondtime.location.domain.City;
import br.com.beyondtime.location.domain.Neighborhood;
import br.com.beyondtime.location.dto.CityResponse;
import br.com.beyondtime.location.dto.NeighborhoodResponse;
import br.com.beyondtime.location.dto.SafePublicPlaceResponse;
import br.com.beyondtime.location.dto.StateResponse;
import br.com.beyondtime.location.repository.CityRepository;
import br.com.beyondtime.location.repository.NeighborhoodRepository;
import br.com.beyondtime.location.repository.SafePublicPlaceRepository;
import br.com.beyondtime.location.repository.StateRepository;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class LocationService {

    private final StateRepository stateRepository;
    private final CityRepository cityRepository;
    private final NeighborhoodRepository neighborhoodRepository;
    private final SafePublicPlaceRepository safePublicPlaceRepository;

    public LocationService(
            StateRepository stateRepository,
            CityRepository cityRepository,
            NeighborhoodRepository neighborhoodRepository,
            SafePublicPlaceRepository safePublicPlaceRepository) {
        this.stateRepository = stateRepository;
        this.cityRepository = cityRepository;
        this.neighborhoodRepository = neighborhoodRepository;
        this.safePublicPlaceRepository = safePublicPlaceRepository;
    }

    public List<StateResponse> listStates() {
        return stateRepository.findAll()
                .stream()
                .map(StateResponse::fromEntity)
                .toList();
    }

    public List<CityResponse> listCities(String stateUf) {
        List<City> cities = (stateUf == null || stateUf.isBlank())
                ? cityRepository.findAllByOrderByMetropolitanAracajuDescNameAsc()
                : cityRepository.findByStateUfIgnoreCaseOrderByMetropolitanAracajuDescNameAsc(stateUf.trim());

        return cities.stream()
                .map(CityResponse::fromEntity)
                .toList();
    }

    public List<NeighborhoodResponse> listNeighborhoodsByCity(Integer cityId) {
        if (!cityRepository.existsById(cityId)) {
            throw new ResourceNotFoundException("Município", cityId);
        }

        return neighborhoodRepository.findByCityIdOrderByNameAsc(cityId)
                .stream()
                .map(NeighborhoodResponse::fromEntity)
                .toList();
    }

    public List<SafePublicPlaceResponse> listSafePublicPlaces(Integer cityId) {
        var places = (cityId == null)
                ? safePublicPlaceRepository.findByActiveTrueOrderByNameAsc()
                : safePublicPlaceRepository.findByCityIdAndActiveTrueOrderByNameAsc(cityId);

        return places.stream()
                .map(SafePublicPlaceResponse::fromEntity)
                .toList();
    }

    public City getCityOrThrow(Integer cityId) {
        return cityRepository.findWithStateById(cityId)
                .orElseThrow(() -> new ResourceNotFoundException("Município", cityId));
    }

    public Neighborhood validateAndGetNeighborhood(Integer cityId, Integer neighborhoodId) {
        if (neighborhoodId == null) {
            return null;
        }
        return neighborhoodRepository.findByIdAndCityId(neighborhoodId, cityId)
                .orElseThrow(() -> new BusinessException(
                        "INVALID_CITY_NEIGHBORHOOD",
                        "O bairro informado não pertence ao município selecionado."
                ));
    }
}
