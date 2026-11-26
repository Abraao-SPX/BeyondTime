package br.com.beyondtime.hobby.service;

import br.com.beyondtime.hobby.domain.Hobby;
import br.com.beyondtime.hobby.domain.HobbyCategory;
import br.com.beyondtime.hobby.domain.UserHobby;
import br.com.beyondtime.hobby.dto.HobbyCategoryCatalogResponse;
import br.com.beyondtime.hobby.dto.HobbyResponse;
import br.com.beyondtime.hobby.dto.UserHobbySelectionRequest;
import br.com.beyondtime.hobby.dto.UserHobbySelectionResponse;
import br.com.beyondtime.hobby.repository.HobbyCategoryRepository;
import br.com.beyondtime.hobby.repository.HobbyRepository;
import br.com.beyondtime.hobby.repository.UserHobbyRepository;
import br.com.beyondtime.profile.domain.ProfileHobby;
import br.com.beyondtime.profile.repository.ProfileHobbyRepository;
import br.com.beyondtime.profile.repository.ProfileRepository;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class HobbyTaxonomyService {

    public static final int MIN_HOBBIES_SELECTION = 3;
    public static final int MAX_HOBBIES_SELECTION = 10;

    private final HobbyCategoryRepository hobbyCategoryRepository;
    private final HobbyRepository hobbyRepository;
    private final UserHobbyRepository userHobbyRepository;
    private final ProfileRepository profileRepository;
    private final ProfileHobbyRepository profileHobbyRepository;

    public HobbyTaxonomyService(
            HobbyCategoryRepository hobbyCategoryRepository,
            HobbyRepository hobbyRepository,
            UserHobbyRepository userHobbyRepository) {
        this(hobbyCategoryRepository, hobbyRepository, userHobbyRepository, null, null);
    }

    @Autowired
    public HobbyTaxonomyService(
            HobbyCategoryRepository hobbyCategoryRepository,
            HobbyRepository hobbyRepository,
            UserHobbyRepository userHobbyRepository,
            ProfileRepository profileRepository,
            ProfileHobbyRepository profileHobbyRepository) {
        this.hobbyCategoryRepository = hobbyCategoryRepository;
        this.hobbyRepository = hobbyRepository;
        this.userHobbyRepository = userHobbyRepository;
        this.profileRepository = profileRepository;
        this.profileHobbyRepository = profileHobbyRepository;
    }

    public List<HobbyCategoryCatalogResponse> getCatalog() {
        List<HobbyCategory> categories = hobbyCategoryRepository.findAllByOrderByDisplayOrderAscNameAsc();
        List<Hobby> activeHobbies = hobbyRepository.findByActiveTrueOrderByCategoryDisplayOrderAscNameAsc();

        Map<Short, List<HobbyResponse>> hobbiesByCategoryId = activeHobbies.stream()
                .map(HobbyResponse::fromEntity)
                .collect(Collectors.groupingBy(HobbyResponse::categoryId));

        return categories.stream()
                .map(category -> HobbyCategoryCatalogResponse.fromEntity(
                        category,
                        hobbiesByCategoryId.getOrDefault(category.getId(), List.of())
                ))
                .filter(cat -> !cat.hobbies().isEmpty())
                .toList();
    }

    public UserHobbySelectionResponse getUserSelection(UUID userId) {
        List<UserHobby> userHobbies = userHobbyRepository.findByIdUserIdOrderByHobbyNameAsc(userId);
        List<HobbyResponse> items = userHobbies.stream()
                .map(UserHobby::getHobby)
                .map(HobbyResponse::fromEntity)
                .toList();

        Instant latestSelection = userHobbies.stream()
                .map(UserHobby::getSelectedAt)
                .max(Comparator.naturalOrder())
                .orElse(Instant.now());

        return new UserHobbySelectionResponse(userId, items.size(), latestSelection, items);
    }

    @Transactional
    public UserHobbySelectionResponse updateUserSelection(
            UUID userId,
            UserHobbySelectionRequest request) {
        if (userId == null) {
            throw new BusinessException("INVALID_USER_ID", "O identificador do usuário é obrigatório.");
        }

        if (request == null || request.hobbyIds() == null) {
            throw new BusinessException(
                    "INVALID_HOBBY_SELECTION_COUNT",
                    "Selecione no mínimo 3 e no máximo 10 hobbies para continuar."
            );
        }

        Set<Integer> distinctHobbyIds = new LinkedHashSet<>(request.hobbyIds());
        int selectedCount = distinctHobbyIds.size();

        if (selectedCount < MIN_HOBBIES_SELECTION || selectedCount > MAX_HOBBIES_SELECTION) {
            throw new BusinessException(
                    "INVALID_HOBBY_SELECTION_COUNT",
                    String.format(
                            "A seleção deve conter entre %d e %d hobbies distintos (informados: %d).",
                            MIN_HOBBIES_SELECTION,
                            MAX_HOBBIES_SELECTION,
                            selectedCount
                    )
            );
        }

        List<Hobby> foundHobbies = hobbyRepository.findByIdInAndActiveTrue(distinctHobbyIds);
        if (foundHobbies.size() != selectedCount) {
            throw new ResourceNotFoundException("Hobby ativo", distinctHobbyIds);
        }

        userHobbyRepository.deleteByIdUserId(userId);
        userHobbyRepository.flush();

        Instant selectedAt = Instant.now();
        List<UserHobby> entitiesToSave = foundHobbies.stream()
                .sorted(Comparator.comparing(Hobby::getName))
                .map(hobby -> new UserHobby(userId, hobby, selectedAt))
                .toList();

        userHobbyRepository.saveAll(entitiesToSave);

        // Sincronização transacional 3FN com profile_hobbies (SEC-ALTA-04 / RF-03)
        if (profileRepository != null && profileHobbyRepository != null) {
            profileRepository.findByUserId(userId).ifPresent(profile -> {
                profileHobbyRepository.deleteAllByProfileId(profile.getId());
                for (Integer hobbyId : distinctHobbyIds) {
                    profileHobbyRepository.save(new ProfileHobby(profile.getId(), hobbyId));
                }
            });
        }

        List<HobbyResponse> savedResponses = entitiesToSave.stream()
                .map(UserHobby::getHobby)
                .map(HobbyResponse::fromEntity)
                .toList();

        return new UserHobbySelectionResponse(userId, savedResponses.size(), selectedAt, savedResponses);
    }
}
