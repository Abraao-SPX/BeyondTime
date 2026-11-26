package br.com.beyondtime.profile.service;

import br.com.beyondtime.hobby.domain.UserHobby;
import br.com.beyondtime.hobby.repository.UserHobbyRepository;
import br.com.beyondtime.location.domain.City;
import br.com.beyondtime.location.repository.CityRepository;
import br.com.beyondtime.profile.domain.ConnectionIntent;
import br.com.beyondtime.profile.domain.Hobby;
import br.com.beyondtime.profile.domain.Profile;
import br.com.beyondtime.profile.domain.ProfileHobby;
import br.com.beyondtime.profile.domain.ProfileIntent;
import br.com.beyondtime.profile.domain.ProfilePhoto;
import br.com.beyondtime.profile.dto.AvatarUploadResponse;
import br.com.beyondtime.profile.dto.HobbyResponse;
import br.com.beyondtime.profile.dto.ProfileResponse;
import br.com.beyondtime.profile.dto.UpsertProfileRequest;
import br.com.beyondtime.profile.repository.ConnectionIntentRepository;
import br.com.beyondtime.profile.repository.HobbyRepository;
import br.com.beyondtime.profile.repository.ProfileHobbyRepository;
import br.com.beyondtime.profile.repository.ProfileIntentRepository;
import br.com.beyondtime.profile.repository.ProfilePhotoRepository;
import br.com.beyondtime.profile.repository.ProfileRepository;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.exception.ResourceNotFoundException;
import br.com.beyondtime.shared.util.XssSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.text.Normalizer;
import java.time.Instant;

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
    private final ProfilePhotoRepository profilePhotoRepository;
    private final AvatarService avatarService;
    private final UserHobbyRepository userHobbyRepository;
    private final br.com.beyondtime.hobby.repository.HobbyRepository hobbyTaxonomyRepository;

    public ProfileService(
            ProfileRepository profileRepository,
            HobbyRepository hobbyRepository,
            ProfileHobbyRepository profileHobbyRepository,
            ConnectionIntentRepository connectionIntentRepository,
            ProfileIntentRepository profileIntentRepository,
            CityRepository cityRepository) {
        this(
                profileRepository,
                hobbyRepository,
                profileHobbyRepository,
                connectionIntentRepository,
                profileIntentRepository,
                cityRepository,
                null,
                null,
                null,
                null
        );
    }

    @Autowired
    public ProfileService(
            ProfileRepository profileRepository,
            HobbyRepository hobbyRepository,
            ProfileHobbyRepository profileHobbyRepository,
            ConnectionIntentRepository connectionIntentRepository,
            ProfileIntentRepository profileIntentRepository,
            CityRepository cityRepository,
            ProfilePhotoRepository profilePhotoRepository,
            AvatarService avatarService,
            UserHobbyRepository userHobbyRepository,
            @Qualifier("hobbyTaxonomyRepository") br.com.beyondtime.hobby.repository.HobbyRepository hobbyTaxonomyRepository) {
        this.profileRepository = profileRepository;
        this.hobbyRepository = hobbyRepository;
        this.profileHobbyRepository = profileHobbyRepository;
        this.connectionIntentRepository = connectionIntentRepository;
        this.profileIntentRepository = profileIntentRepository;
        this.cityRepository = cityRepository;
        this.profilePhotoRepository = profilePhotoRepository;
        this.avatarService = avatarService;
        this.userHobbyRepository = userHobbyRepository;
        this.hobbyTaxonomyRepository = hobbyTaxonomyRepository;
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

        if (XssSanitizer.containsMaliciousScript(request.fullName())
                || XssSanitizer.containsMaliciousScript(request.city())
                || XssSanitizer.containsMaliciousScript(request.goal())) {
            throw new BusinessException(
                    "XSS_PAYLOAD_DETECTED",
                    "Conteúdo não permitido detectado nos dados do perfil.",
                    HttpStatus.BAD_REQUEST
            );
        }

        String displayName = XssSanitizer.sanitizeSingleLine(request.fullName());
        if (displayName.length() < 2) {
            throw new BusinessException(
                    "INVALID_DISPLAY_NAME",
                    "O nome de exibição informado não é válido.",
                    HttpStatus.BAD_REQUEST
            );
        }
        String sanitizedBio = XssSanitizer.sanitizeMultiLine(request.bio());
        String firstName = extractFirstName(displayName);
        Integer cityId = resolveCityId(XssSanitizer.sanitizeSingleLine(request.city()));

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

        // Sincronização transacional 3FN com user_hobbies (SEC-ALTA-04 / RF-03)
        if (userHobbyRepository != null && hobbyTaxonomyRepository != null) {
            userHobbyRepository.deleteByIdUserId(userId);
            userHobbyRepository.flush();
            List<br.com.beyondtime.hobby.domain.Hobby> taxonomyHobbies =
                    hobbyTaxonomyRepository.findByIdInAndActiveTrue(matchedHobbyIds);
            Instant selectedAt = Instant.now();
            List<UserHobby> userHobbies = taxonomyHobbies.stream()
                    .map(h -> new UserHobby(userId, h, selectedAt))
                    .toList();
            userHobbyRepository.saveAll(userHobbies);
        }

        String intentCode = mapGoalToIntentCode(request.goal());
        profileIntentRepository.deleteAllByProfileId(profile.getId());
        UUID savedProfileId = profile.getId();
        connectionIntentRepository.findByCodeIgnoreCase(intentCode)
                .ifPresent(intent -> profileIntentRepository.save(new ProfileIntent(savedProfileId, intent.getId())));

        return toResponse(profile);
    }

    @Transactional
    public AvatarUploadResponse updateMyAvatar(UUID userId, MultipartFile file) {
        Profile profile = profileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Perfil", userId));

        ProfilePhoto existingPhoto = profilePhotoRepository
                .findByProfileIdAndPosition(profile.getId(), (short) 1)
                .orElse(null);

        String avatarAntigo = existingPhoto != null ? existingPhoto.getObjectKey() : null;
        String novoNome = avatarService.salvarAvatar(file, avatarAntigo);

        if (existingPhoto == null) {
            profilePhotoRepository.save(new ProfilePhoto(profile.getId(), novoNome, (short) 1));
        } else {
            existingPhoto.updateObjectKey(novoNome);
            profilePhotoRepository.save(existingPhoto);
        }

        return new AvatarUploadResponse(novoNome, avatarService.buildAvatarUrl(novoNome));
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

        String avatarUrl = null;
        if (profilePhotoRepository != null && avatarService != null) {
            avatarUrl = profilePhotoRepository.findByProfileIdAndPosition(profile.getId(), (short) 1)
                    .filter(photo -> "ACTIVE".equalsIgnoreCase(photo.getStatus()))
                    .map(photo -> avatarService.buildAvatarUrl(photo.getObjectKey()))
                    .orElse(null);
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
                avatarUrl,
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

    public Hobby matchHobby(String input, List<Hobby> catalog) {
        if (input == null || input.isBlank() || catalog == null || catalog.isEmpty()) {
            return null;
        }
        String clean = input.trim();

        // 1. Correspondência direta por ID numérico
        try {
            int numericId = Integer.parseInt(clean);
            for (Hobby h : catalog) {
                if (h.getId() != null && h.getId() == numericId) {
                    return h;
                }
            }
        } catch (NumberFormatException ignored) {
        }

        String normalizedInput = normalizeText(clean);

        // 2. Correspondência exata por código ou nome normalizado (sem acentos e case-insensitive)
        for (Hobby h : catalog) {
            if (h.getCode() != null && normalizeText(h.getCode()).equals(normalizedInput)) {
                return h;
            }
            if (h.getName() != null && normalizeText(h.getName()).equals(normalizedInput)) {
                return h;
            }
        }

        // 3. Correspondência exata por slug (com traços / underscores)
        String slugCandidate = normalizedInput.replace(' ', '-').replace('_', '-');
        for (Hobby h : catalog) {
            if (h.getSlug() != null && normalizeText(h.getSlug()).replace('_', '-').equals(slugCandidate)) {
                return h;
            }
            if (h.getCode() != null && normalizeText(h.getCode()).replace('_', '-').equals(slugCandidate)) {
                return h;
            }
        }

        return null;
    }

    private static String normalizeText(String input) {
        if (input == null) return "";
        return Normalizer.normalize(input.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
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
