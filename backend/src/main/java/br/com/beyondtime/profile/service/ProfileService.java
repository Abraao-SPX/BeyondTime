package br.com.beyondtime.profile.service;

import br.com.beyondtime.location.domain.City;
import br.com.beyondtime.location.repository.CityRepository;
import br.com.beyondtime.profile.domain.ConnectionIntent;
import br.com.beyondtime.profile.domain.Hobby;
import br.com.beyondtime.profile.domain.Profile;
import br.com.beyondtime.profile.domain.ProfileHobby;
import br.com.beyondtime.profile.domain.ProfileIntent;
import br.com.beyondtime.profile.dto.HobbyResponse;
import br.com.beyondtime.profile.dto.ProfileResponse;
import br.com.beyondtime.profile.dto.UpsertProfileRequest;
import br.com.beyondtime.profile.repository.ConnectionIntentRepository;
import br.com.beyondtime.profile.repository.HobbyRepository;
import br.com.beyondtime.profile.repository.ProfileHobbyRepository;
import br.com.beyondtime.profile.repository.ProfileIntentRepository;
import br.com.beyondtime.profile.repository.ProfileRepository;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.exception.ResourceNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final HobbyRepository hobbyRepository;
    private final ProfileHobbyRepository profileHobbyRepository;
    private final ConnectionIntentRepository connectionIntentRepository;
    private final ProfileIntentRepository profileIntentRepository;
    private final CityRepository cityRepository;

    public ProfileService(
            ProfileRepository profileRepository,
            HobbyRepository hobbyRepository,
            ProfileHobbyRepository profileHobbyRepository,
            ConnectionIntentRepository connectionIntentRepository,
            ProfileIntentRepository profileIntentRepository,
            CityRepository cityRepository) {
        this.profileRepository = profileRepository;
        this.hobbyRepository = hobbyRepository;
        this.profileHobbyRepository = profileHobbyRepository;
        this.connectionIntentRepository = connectionIntentRepository;
        this.profileIntentRepository = profileIntentRepository;
        this.cityRepository = cityRepository;
    }

    @Transactional(readOnly = true)
    public List<HobbyResponse> listAllHobbies() {
        return hobbyRepository.findAllByOrderByIdAsc()
                .stream()
                .map(HobbyResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProfileResponse getProfileByUserId(UUID userId) {
        Profile profile = profileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Perfil", userId));
        return toResponse(profile);
    }

    @Transactional
    public ProfileResponse upsertProfile(UUID userId, UpsertProfileRequest request) {
        List<String> rawHobbies = request.hobbies() != null ? request.hobbies() : List.of();
        List<String> distinctInputs = rawHobbies.stream()
                .filter(h -> h != null && !h.isBlank())
                .map(String::trim)
                .distinct()
                .toList();

        if (distinctInputs.size() < 3 || distinctInputs.size() > 10) {
            throw new BusinessException(
                    "INVALID_HOBBIES_COUNT",
                    "Selecione no mínimo 3 e no máximo 10 hobbies distintos para o seu perfil (RF-03).",
                    HttpStatus.BAD_REQUEST
            );
        }

        List<Hobby> allHobbies = hobbyRepository.findAllByOrderByIdAsc();
        Set<Integer> matchedHobbyIds = new LinkedHashSet<>();
        for (String hInput : distinctInputs) {
            Hobby matched = matchHobby(hInput, allHobbies);
            if (matched != null) {
                matchedHobbyIds.add(matched.getId());
            }
        }

        if (matchedHobbyIds.size() < 3 || matchedHobbyIds.size() > 10) {
            throw new BusinessException(
                    "INVALID_HOBBIES_COUNT",
                    "Selecione no mínimo 3 e no máximo 10 hobbies válidos do catálogo para o seu perfil (RF-03).",
                    HttpStatus.BAD_REQUEST
            );
        }

        String displayName = sanitizePlainText(request.fullName());
        String sanitizedBio = sanitizeBio(request.bio());
        String firstName = extractFirstName(displayName);
        Integer cityId = resolveCityId(request.city());

        Profile profile = profileRepository.findByUserId(userId).orElse(null);
        if (profile == null) {
            profile = new Profile(userId, displayName, firstName, cityId, sanitizedBio);
        } else {
            profile.updateProfileInfo(displayName, firstName, cityId, sanitizedBio);
        }
        profile = profileRepository.saveAndFlush(profile);

        profileHobbyRepository.deleteAllByProfileId(profile.getId());
        for (Integer hobbyId : matchedHobbyIds) {
            profileHobbyRepository.save(new ProfileHobby(profile.getId(), hobbyId));
        }

        String intentCode = mapGoalToIntentCode(request.goal());
        profileIntentRepository.deleteAllByProfileId(profile.getId());
        UUID savedProfileId = profile.getId();
        connectionIntentRepository.findByCodeIgnoreCase(intentCode)
                .ifPresent(intent -> profileIntentRepository.save(new ProfileIntent(savedProfileId, intent.getId())));

        return toResponse(profile);
    }

    private String sanitizePlainText(String input) {
        if (input == null) return "";
        return input.replaceAll("<[^>]*>", "")
                .replaceAll("[\\p{Cntrl}]", "")
                .trim();
    }

    private String sanitizeBio(String bio) {
        if (bio == null || bio.isBlank()) return null;
        String clean = bio.replaceAll("<[^>]*>", "")
                .replaceAll("[\\p{Cntrl}&&[^\r\n\t]]", "")
                .trim();
        return clean.isEmpty() ? null : clean;
    }

    private ProfileResponse toResponse(Profile profile) {
        String cityName = cityRepository.findById(profile.getCityId())
                .map(c -> c.getName() + " (SE)")
                .orElse("Aracaju (SE)");

        List<Integer> hobbyIds = profileHobbyRepository.findHobbyIdsByProfileId(profile.getId());
        List<String> hobbyNames = hobbyRepository.findAllById(hobbyIds)
                .stream()
                .map(Hobby::getName)
                .toList();

        List<Short> intentIds = profileIntentRepository.findIntentIdsByProfileId(profile.getId());
        String goal = "Amizade";
        if (!intentIds.isEmpty()) {
            goal = connectionIntentRepository.findById(intentIds.get(0))
                    .map(ci -> mapIntentCodeToGoal(ci.getCode()))
                    .orElse("Amizade");
        }

        return new ProfileResponse(
                profile.getId(),
                profile.getUserId(),
                profile.getDisplayName(),
                profile.getFirstName(),
                profile.getBio(),
                cityName,
                hobbyNames,
                goal,
                profile.getVerificationStatus(),
                profile.isVerifiedBadge50plus()
        );
    }

    private String extractFirstName(String fullName) {
        String[] parts = fullName.trim().split("\\s+");
        String first = parts.length > 0 ? parts[0] : fullName;
        return first.length() > 50 ? first.substring(0, 50) : first;
    }

    private Integer resolveCityId(String rawCity) {
        String cleanName = rawCity == null ? "Aracaju" : rawCity.replace("(SE)", "").trim();
        return cityRepository.findFirstByNameIgnoreCase(cleanName)
                .or(() -> cityRepository.findFirstByNameIgnoreCase("Aracaju"))
                .map(City::getId)
                .orElse(1);
    }

    private Hobby matchHobby(String input, List<Hobby> catalog) {
        if (input == null || input.isBlank()) return null;
        String clean = input.trim().toLowerCase(Locale.ROOT);
        for (Hobby h : catalog) {
            if (h.getCode().equalsIgnoreCase(clean) || h.getName().equalsIgnoreCase(clean)) {
                return h;
            }
        }
        for (Hobby h : catalog) {
            String hName = h.getName().toLowerCase(Locale.ROOT);
            if (hName.contains(clean) || clean.contains(hName.split("\\s+")[0])) {
                return h;
            }
        }
        return null;
    }

    private String mapGoalToIntentCode(String goal) {
        if (goal == null) return "FRIENDSHIP";
        return switch (goal.trim().toLowerCase(Locale.ROOT)) {
            case "relacionamento", "relationship" -> "RELATIONSHIP";
            case "companhia", "companionship" -> "COMPANIONSHIP";
            default -> "FRIENDSHIP";
        };
    }

    private String mapIntentCodeToGoal(String code) {
        if (code == null) return "Amizade";
        return switch (code.toUpperCase(Locale.ROOT)) {
            case "RELATIONSHIP" -> "Relacionamento";
            case "COMPANIONSHIP" -> "Companhia";
            default -> "Amizade";
        };
    }
}
