package br.com.beyondtime.discovery.service;

import br.com.beyondtime.auth.domain.User;
import br.com.beyondtime.auth.domain.UserStatus;
import br.com.beyondtime.auth.repository.UserRepository;
import br.com.beyondtime.chat.domain.ChatMatch;
import br.com.beyondtime.chat.domain.Conversation;
import br.com.beyondtime.chat.repository.ChatMatchRepository;
import br.com.beyondtime.chat.repository.ChatUserBlockRepository;
import br.com.beyondtime.chat.repository.ConversationRepository;
import br.com.beyondtime.discovery.domain.ProfileInteraction;
import br.com.beyondtime.discovery.dto.DiscoveryProfileResponse;
import br.com.beyondtime.discovery.dto.MatchInteractionRequest;
import br.com.beyondtime.discovery.dto.MatchInteractionResponse;
import br.com.beyondtime.discovery.dto.MatchSummaryResponse;
import br.com.beyondtime.discovery.repository.ProfileInteractionRepository;
import br.com.beyondtime.hobby.domain.UserHobby;
import br.com.beyondtime.hobby.repository.UserHobbyRepository;
import br.com.beyondtime.location.domain.City;
import br.com.beyondtime.location.domain.Neighborhood;
import br.com.beyondtime.location.repository.CityRepository;
import br.com.beyondtime.location.repository.NeighborhoodRepository;
import br.com.beyondtime.profile.domain.ConnectionIntent;
import br.com.beyondtime.profile.domain.Hobby;
import br.com.beyondtime.profile.domain.Profile;
import br.com.beyondtime.profile.domain.ProfilePhoto;
import br.com.beyondtime.profile.repository.ConnectionIntentRepository;
import br.com.beyondtime.profile.repository.HobbyRepository;
import br.com.beyondtime.profile.repository.ProfileHobbyRepository;
import br.com.beyondtime.profile.repository.ProfileIntentRepository;
import br.com.beyondtime.profile.repository.ProfilePhotoRepository;
import br.com.beyondtime.profile.repository.ProfileRepository;
import br.com.beyondtime.profile.service.AvatarService;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.exception.ResourceNotFoundException;
import br.com.beyondtime.shared.util.AgeValidator;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.Period;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class DiscoveryService {

    private static final int DEFAULT_DISCOVERY_LIMIT = 30;
    private static final int MAX_DISCOVERY_LIMIT = 100;
    private static final double EARTH_RADIUS_KM = 6371.0;

    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final ProfileHobbyRepository profileHobbyRepository;
    private final UserHobbyRepository userHobbyRepository;
    private final HobbyRepository hobbyRepository;
    private final ProfileIntentRepository profileIntentRepository;
    private final ConnectionIntentRepository connectionIntentRepository;
    private final ProfilePhotoRepository profilePhotoRepository;
    private final CityRepository cityRepository;
    private final NeighborhoodRepository neighborhoodRepository;
    private final ChatUserBlockRepository blockRepository;
    private final ProfileInteractionRepository interactionRepository;
    private final ChatMatchRepository matchRepository;
    private final ConversationRepository conversationRepository;
    private final AvatarService avatarService;
    private final JdbcTemplate jdbcTemplate;
    private volatile Boolean postgreSqlCached;

    public DiscoveryService(
            ProfileRepository profileRepository,
            UserRepository userRepository,
            ProfileHobbyRepository profileHobbyRepository,
            UserHobbyRepository userHobbyRepository,
            HobbyRepository hobbyRepository,
            ProfileIntentRepository profileIntentRepository,
            ConnectionIntentRepository connectionIntentRepository,
            ProfilePhotoRepository profilePhotoRepository,
            CityRepository cityRepository,
            NeighborhoodRepository neighborhoodRepository,
            ChatUserBlockRepository blockRepository,
            ProfileInteractionRepository interactionRepository,
            ChatMatchRepository matchRepository,
            ConversationRepository conversationRepository,
            AvatarService avatarService,
            JdbcTemplate jdbcTemplate) {
        this.profileRepository = profileRepository;
        this.userRepository = userRepository;
        this.profileHobbyRepository = profileHobbyRepository;
        this.userHobbyRepository = userHobbyRepository;
        this.hobbyRepository = hobbyRepository;
        this.profileIntentRepository = profileIntentRepository;
        this.connectionIntentRepository = connectionIntentRepository;
        this.profilePhotoRepository = profilePhotoRepository;
        this.cityRepository = cityRepository;
        this.neighborhoodRepository = neighborhoodRepository;
        this.blockRepository = blockRepository;
        this.interactionRepository = interactionRepository;
        this.matchRepository = matchRepository;
        this.conversationRepository = conversationRepository;
        this.avatarService = avatarService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public List<DiscoveryProfileResponse> discoverProfiles(
            UUID currentUserId,
            String cityFilter,
            String goalFilter,
            List<String> hobbyFilters,
            Boolean onlyVerified,
            Integer limit) {

        int safeLimit = limit == null
                ? DEFAULT_DISCOVERY_LIMIT
                : Math.min(Math.max(limit, 1), MAX_DISCOVERY_LIMIT);

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", currentUserId));

        Optional<Profile> myProfileOpt = profileRepository.findByUserId(currentUserId);

        // Pré-carrega tabelas de referência para evitar N+1
        Map<Integer, Hobby> hobbyById = new HashMap<>();
        for (Hobby h : hobbyRepository.findAllByOrderByIdAsc()) {
            hobbyById.put(h.getId(), h);
        }
        Map<Integer, City> cityById = new HashMap<>();
        for (City c : cityRepository.findAll()) {
            cityById.put(c.getId(), c);
        }
        Map<Short, ConnectionIntent> intentById = new HashMap<>();
        for (ConnectionIntent ci : connectionIntentRepository.findAll()) {
            intentById.put(ci.getId(), ci);
        }

        // Conjuntos de exclusão: próprio usuário, bloqueados (mútuo), já interagidos, já com match ativo
        Set<UUID> excludedUserIds = new HashSet<>();
        excludedUserIds.add(currentUserId);
        excludedUserIds.addAll(blockRepository.findMutuallyBlockedUserIds(currentUserId));
        excludedUserIds.addAll(interactionRepository.findInteractedTargetUserIds(currentUserId));
        for (ChatMatch activeMatch : matchRepository.findActiveMatchesForUser(currentUserId)) {
            excludedUserIds.add(activeMatch.getOtherUserId(currentUserId));
        }

        UserContext me = buildUserContext(currentUser, myProfileOpt.orElse(null), hobbyById, cityById, intentById);

        String normalizedCityFilter = normalizeCityFilter(cityFilter);
        String normalizedGoalFilter = normalizeGoalFilter(goalFilter);
        Set<Integer> requiredHobbyIds = resolveFilterHobbyIds(hobbyFilters, hobbyById);
        boolean requireVerified = Boolean.TRUE.equals(onlyVerified);

        LocalDate maxBirthDate = LocalDate.now(AgeValidator.SERGIPE_ZONE).minusYears(50);
        List<Profile> candidateProfiles = profileRepository.findDiscoveryCandidates(
                UserStatus.ACTIVE,
                maxBirthDate,
                excludedUserIds
        );

        List<UUID> candidateUserIds = candidateProfiles.stream()
                .map(Profile::getUserId)
                .toList();

        Map<UUID, User> usersById = new HashMap<>();
        if (!candidateUserIds.isEmpty()) {
            for (User u : userRepository.findAllById(candidateUserIds)) {
                usersById.put(u.getId(), u);
            }
        }

        List<ScoredCandidateInternal> scored = new ArrayList<>();
        for (Profile candidateProfile : candidateProfiles) {
            UUID candidateUserId = candidateProfile.getUserId();
            User candidateUser = usersById.get(candidateUserId);
            if (candidateUser == null || candidateUser.getStatus() != UserStatus.ACTIVE) {
                continue;
            }

            int candidateAge = calculateAge(candidateUser.getBirthDate());
            if (candidateAge < 50) {
                continue;
            }

            if (requireVerified && !candidateProfile.isVerifiedBadge50plus()) {
                continue;
            }

            UserContext candidate = buildUserContext(candidateUser, candidateProfile, hobbyById, cityById, intentById);

            if (normalizedCityFilter != null && !normalizeText(candidate.cityName()).equals(normalizedCityFilter)) {
                continue;
            }

            if (normalizedGoalFilter != null && !normalizeText(candidate.goal()).equals(normalizedGoalFilter)) {
                continue;
            }

            if (!requiredHobbyIds.isEmpty()) {
                boolean hasAnyRequestedHobby = candidate.hobbyIds().stream().anyMatch(requiredHobbyIds::contains);
                if (!hasAnyRequestedHobby) {
                    continue;
                }
            }

            AffinityScore affinity = computeAffinity(me, candidate, hobbyById);
            DiscoveryProfileResponse dto = toDiscoveryResponse(candidateProfile, candidate, affinity, hobbyById);
            scored.add(new ScoredCandidateInternal(dto, candidateProfile.getUpdatedAt()));
        }

        scored.sort(Comparator
                .comparingInt((ScoredCandidateInternal s) -> s.response().affinityPercent()).reversed()
                .thenComparing((ScoredCandidateInternal s) -> s.response().sameCity(), Comparator.reverseOrder())
                .thenComparing(Comparator.comparingInt((ScoredCandidateInternal s) -> s.response().sharedHobbiesCount()).reversed())
                .thenComparing(ScoredCandidateInternal::updatedAt, Comparator.nullsLast(Comparator.reverseOrder())));

        return scored.stream()
                .limit(safeLimit)
                .map(ScoredCandidateInternal::response)
                .toList();
    }

    @Transactional
    public MatchInteractionResponse likeUser(UUID currentUserId, MatchInteractionRequest request) {
        UUID targetUserId = request.targetUserId();
        validateInteractionEligibility(currentUserId, targetUserId);
        enforceDefensiveModalConfirmation(request);

        UUID userA = currentUserId.toString().compareTo(targetUserId.toString()) < 0 ? currentUserId : targetUserId;
        UUID userB = currentUserId.toString().compareTo(targetUserId.toString()) < 0 ? targetUserId : currentUserId;
        // SEC-ALTA-06: lock transacional determinístico por par ordenado para eliminar race condition de lost mutual match
        acquirePairTransactionLock(userA, userB);

        boolean confirmedViaModal = true;
        AffinitySummary affinitySummary = computeAffinityBetweenUsers(currentUserId, targetUserId);

        ProfileInteraction interaction = interactionRepository
                .findByFromUserIdAndToUserId(currentUserId, targetUserId)
                .map(existing -> {
                    existing.updateAction("LIKE", confirmedViaModal, affinitySummary.affinityDecimal());
                    return interactionRepository.saveAndFlush(existing);
                })
                .orElseGet(() -> interactionRepository.saveAndFlush(new ProfileInteraction(
                        currentUserId,
                        targetUserId,
                        "LIKE",
                        confirmedViaModal,
                        affinitySummary.affinityDecimal()
                )));

        boolean reciprocalLike = interactionRepository.existsByFromUserIdAndToUserIdAndAction(
                targetUserId, currentUserId, "LIKE"
        );

        if (!reciprocalLike) {
            return new MatchInteractionResponse(
                    interaction.getAction(),
                    targetUserId,
                    false,
                    null,
                    null,
                    affinitySummary.affinityPercent(),
                    affinitySummary.sharedHobbyNames(),
                    null
            );
        }

        short commonCount = (short) Math.min(affinitySummary.sharedHobbyNames().size(), Short.MAX_VALUE);
        ChatMatch match = findOrCreateActiveMatch(userA, userB, affinitySummary.affinityDecimal(), commonCount);
        Conversation conversation = findOrCreateActiveConversation(match.getId());

        return new MatchInteractionResponse(
                "LIKE",
                targetUserId,
                true,
                match.getId(),
                conversation.getId(),
                affinitySummary.affinityPercent(),
                affinitySummary.sharedHobbyNames(),
                affinitySummary.targetProfileDto()
        );
    }

    private ChatMatch findOrCreateActiveMatch(
            UUID userA,
            UUID userB,
            BigDecimal affinityDecimal,
            short commonCount) {
        return matchRepository.findByPair(userA, userB)
                .map(existing -> {
                    existing.reactivateWithAffinity(affinityDecimal, commonCount);
                    return matchRepository.save(existing);
                })
                .orElseGet(() -> {
                    try {
                        return matchRepository.saveAndFlush(new ChatMatch(userA, userB, affinityDecimal, commonCount));
                    } catch (DataIntegrityViolationException ex) {
                        return matchRepository.findByPair(userA, userB).orElseThrow(() -> ex);
                    }
                });
    }

    private Conversation findOrCreateActiveConversation(UUID matchId) {
        return conversationRepository.findByMatchId(matchId)
                .map(existing -> {
                    if (!"ACTIVE".equalsIgnoreCase(existing.getStatus())) {
                        existing.markStatus("ACTIVE");
                        return conversationRepository.save(existing);
                    }
                    return existing;
                })
                .orElseGet(() -> {
                    try {
                        return conversationRepository.saveAndFlush(new Conversation(matchId));
                    } catch (DataIntegrityViolationException ex) {
                        return conversationRepository.findByMatchId(matchId).orElseThrow(() -> ex);
                    }
                });
    }

    @Transactional
    public MatchInteractionResponse passUser(UUID currentUserId, MatchInteractionRequest request) {
        UUID targetUserId = request.targetUserId();
        validateInteractionEligibility(currentUserId, targetUserId);
        enforceDefensiveModalConfirmation(request);

        boolean confirmedViaModal = true;
        AffinitySummary affinitySummary = computeAffinityBetweenUsers(currentUserId, targetUserId);

        interactionRepository.findByFromUserIdAndToUserId(currentUserId, targetUserId)
                .map(existing -> {
                    existing.updateAction("PASS", confirmedViaModal, affinitySummary.affinityDecimal());
                    return interactionRepository.save(existing);
                })
                .orElseGet(() -> interactionRepository.save(new ProfileInteraction(
                        currentUserId,
                        targetUserId,
                        "PASS",
                        confirmedViaModal,
                        affinitySummary.affinityDecimal()
                )));

        return new MatchInteractionResponse(
                "PASS",
                targetUserId,
                false,
                null,
                null,
                affinitySummary.affinityPercent(),
                affinitySummary.sharedHobbyNames(),
                null
        );
    }

    @Transactional(readOnly = true)
    public List<MatchSummaryResponse> listMyMatches(UUID currentUserId) {
        List<ChatMatch> activeMatches = matchRepository.findActiveMatchesForUser(currentUserId);
        List<MatchSummaryResponse> results = new ArrayList<>();

        Map<Integer, Hobby> hobbyById = new HashMap<>();
        for (Hobby h : hobbyRepository.findAllByOrderByIdAsc()) {
            hobbyById.put(h.getId(), h);
        }
        Set<Integer> myHobbyIds = resolveUserHobbyIds(currentUserId, profileRepository.findByUserId(currentUserId).orElse(null));

        for (ChatMatch match : activeMatches) {
            UUID otherUserId = match.getOtherUserId(currentUserId);
            if (blockRepository.existsBlockBetween(currentUserId, otherUserId)) {
                continue;
            }

            Optional<User> otherUserOpt = userRepository.findById(otherUserId);
            if (otherUserOpt.isEmpty() || otherUserOpt.get().getStatus() != UserStatus.ACTIVE) {
                continue;
            }
            Optional<Profile> otherProfileOpt = profileRepository.findByUserId(otherUserId);
            Optional<Conversation> convOpt = conversationRepository.findByMatchId(match.getId());

            String contactName = otherProfileOpt.map(Profile::getDisplayName).orElse("Contato BeyondTime");
            Integer contactAge = calculateAge(otherUserOpt.get().getBirthDate());
            String contactCity = otherProfileOpt.map(Profile::getCityId)
                    .flatMap(cityRepository::findById)
                    .map(City::getName)
                    .orElse("Sergipe");
            String avatarUrl = resolveAvatarUrl(otherProfileOpt.orElse(null));
            String goal = resolveGoal(otherProfileOpt.orElse(null), null);
            boolean verified = otherProfileOpt.map(Profile::isVerifiedBadge50plus).orElse(false);

            Set<Integer> otherHobbyIds = resolveUserHobbyIds(otherUserId, otherProfileOpt.orElse(null));
            List<String> sharedHobbies = otherHobbyIds.stream()
                    .filter(myHobbyIds::contains)
                    .map(hobbyById::get)
                    .filter(h -> h != null)
                    .map(Hobby::getName)
                    .toList();

            int affinity = match.getAffinityPercentage() != null
                    ? match.getAffinityPercentage().setScale(0, RoundingMode.HALF_UP).intValue()
                    : 85;

            results.add(new MatchSummaryResponse(
                    match.getId(),
                    convOpt.map(Conversation::getId).orElse(null),
                    otherUserId,
                    contactName,
                    contactAge,
                    contactCity,
                    avatarUrl,
                    goal,
                    verified,
                    affinity,
                    sharedHobbies,
                    match.getCreatedAt()
            ));
        }

        return results;
    }

    private void validateInteractionEligibility(UUID currentUserId, UUID targetUserId) {
        if (currentUserId.equals(targetUserId)) {
            throw new BusinessException(
                    "SELF_INTERACTION_NOT_ALLOWED",
                    "Não é possível curtir ou passar o próprio perfil.",
                    HttpStatus.BAD_REQUEST
            );
        }

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Perfil", targetUserId));

        if (targetUser.getStatus() != UserStatus.ACTIVE) {
            throw new ResourceNotFoundException("Perfil", targetUserId);
        }

        if (blockRepository.existsBlockBetween(currentUserId, targetUserId)) {
            throw new BusinessException(
                    "CONTACT_BLOCKED",
                    "Não é possível interagir com este perfil devido a um bloqueio ativo.",
                    HttpStatus.FORBIDDEN
            );
        }
    }

    private AffinitySummary computeAffinityBetweenUsers(UUID currentUserId, UUID targetUserId) {
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", currentUserId));
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", targetUserId));

        Profile myProfile = profileRepository.findByUserId(currentUserId).orElse(null);
        Profile targetProfile = profileRepository.findByUserId(targetUserId).orElse(null);

        Map<Integer, Hobby> hobbyById = new HashMap<>();
        for (Hobby h : hobbyRepository.findAllByOrderByIdAsc()) {
            hobbyById.put(h.getId(), h);
        }
        Map<Integer, City> cityById = new HashMap<>();
        for (City c : cityRepository.findAll()) {
            cityById.put(c.getId(), c);
        }
        Map<Short, ConnectionIntent> intentById = new HashMap<>();
        for (ConnectionIntent ci : connectionIntentRepository.findAll()) {
            intentById.put(ci.getId(), ci);
        }

        UserContext me = buildUserContext(currentUser, myProfile, hobbyById, cityById, intentById);
        UserContext target = buildUserContext(targetUser, targetProfile, hobbyById, cityById, intentById);
        AffinityScore score = computeAffinity(me, target, hobbyById);

        List<String> sharedNames = score.sharedHobbies().stream().map(Hobby::getName).toList();
        DiscoveryProfileResponse dto = targetProfile != null
                ? toDiscoveryResponse(targetProfile, target, score, hobbyById)
                : null;

        return new AffinitySummary(
                score.affinityPercent(),
                BigDecimal.valueOf(score.affinityPercent()).setScale(2, RoundingMode.HALF_UP),
                sharedNames,
                dto
        );
    }

    private UserContext buildUserContext(
            User user,
            Profile profile,
            Map<Integer, Hobby> hobbyById,
            Map<Integer, City> cityById,
            Map<Short, ConnectionIntent> intentById) {
        int age = calculateAge(user.getBirthDate());
        City city = (profile != null && profile.getCityId() != null) ? cityById.get(profile.getCityId()) : null;
        String cityName = city != null ? city.getName() : "Sergipe";
        String neighborhoodName = (profile != null && profile.getNeighborhoodId() != null)
                ? neighborhoodRepository.findById(profile.getNeighborhoodId()).map(Neighborhood::getName).orElse(null)
                : null;
        String goal = resolveGoal(profile, intentById);
        Set<Integer> hobbyIds = resolveUserHobbyIds(user.getId(), profile);
        String avatarUrl = resolveAvatarUrl(profile);

        return new UserContext(
                user.getId(),
                age,
                city,
                cityName,
                neighborhoodName,
                goal,
                hobbyIds,
                avatarUrl
        );
    }

    private Set<Integer> resolveUserHobbyIds(UUID userId, Profile profile) {
        Set<Integer> ids = new LinkedHashSet<>();
        if (profile != null && profile.getId() != null) {
            ids.addAll(profileHobbyRepository.findHobbyIdsByProfileId(profile.getId()));
        }
        if (ids.isEmpty()) {
            List<UserHobby> userHobbies = userHobbyRepository.findByIdUserIdOrderByHobbyNameAsc(userId);
            for (UserHobby uh : userHobbies) {
                if (uh.getHobby() != null && uh.getHobby().getId() != null) {
                    ids.add(uh.getHobby().getId());
                }
            }
        }
        return ids;
    }

    private AffinityScore computeAffinity(UserContext me, UserContext candidate, Map<Integer, Hobby> hobbyById) {
        List<Hobby> sharedHobbies = new ArrayList<>();
        for (Integer hobbyId : candidate.hobbyIds()) {
            if (me.hobbyIds().contains(hobbyId)) {
                Hobby h = hobbyById.get(hobbyId);
                if (h != null) {
                    sharedHobbies.add(h);
                }
            }
        }

        // 1. Hobbies em comum (peso 60)
        double hobbyScore;
        if (me.hobbyIds().isEmpty() || candidate.hobbyIds().isEmpty()) {
            hobbyScore = 20.0;
        } else {
            double denominator = Math.max(1.0, Math.min(Math.min(me.hobbyIds().size(), candidate.hobbyIds().size()), 5));
            double ratio = Math.min(1.0, sharedHobbies.size() / denominator);
            hobbyScore = ratio * 60.0;
        }

        // 2. Proximidade geográfica em Sergipe (peso 25)
        boolean sameCity = me.city() != null && candidate.city() != null
                && me.city().getId().equals(candidate.city().getId());
        Double distanceKm = calculateDistanceKm(me.city(), candidate.city());
        boolean sameRegion = sameCity
                || (me.city() != null && candidate.city() != null
                    && me.city().isMetropolitanAracaju() && candidate.city().isMetropolitanAracaju())
                || (distanceKm != null && distanceKm <= 30.0);

        double locationScore;
        if (sameCity) {
            locationScore = 25.0;
        } else if (sameRegion) {
            locationScore = 18.0;
        } else if (distanceKm != null && distanceKm <= 60.0) {
            locationScore = 13.0;
        } else if (distanceKm != null && distanceKm <= 120.0) {
            locationScore = 9.0;
        } else {
            locationScore = 6.0;
        }

        // 3. Objetivo em comum (peso 10)
        double goalScore = normalizeText(me.goal()).equals(normalizeText(candidate.goal())) ? 10.0 : 4.0;

        // 4. Proximidade etária (peso 5)
        int ageDiff = Math.abs(me.age() - candidate.age());
        double ageScore = ageDiff <= 5 ? 5.0 : (ageDiff <= 10 ? 3.0 : 1.0);

        int total = (int) Math.round(hobbyScore + locationScore + goalScore + ageScore);
        int clamped = Math.max(1, Math.min(100, total));

        return new AffinityScore(clamped, sharedHobbies, sameCity, sameRegion, distanceKm);
    }

    private DiscoveryProfileResponse toDiscoveryResponse(
            Profile profile,
            UserContext candidate,
            AffinityScore affinity,
            Map<Integer, Hobby> hobbyById) {
        List<Hobby> candidateHobbies = candidate.hobbyIds().stream()
                .map(hobbyById::get)
                .filter(h -> h != null)
                .toList();

        List<String> hobbyNames = candidateHobbies.stream().map(Hobby::getName).toList();
        List<String> hobbySlugs = candidateHobbies.stream()
                .map(h -> h.getSlug() != null ? h.getSlug() : normalizeText(h.getCode()).replace('_', '-'))
                .toList();

        List<String> sharedNames = affinity.sharedHobbies().stream().map(Hobby::getName).toList();
        List<String> sharedSlugs = affinity.sharedHobbies().stream()
                .map(h -> h.getSlug() != null ? h.getSlug() : normalizeText(h.getCode()).replace('_', '-'))
                .toList();

        String cityWithState = candidate.cityName() + " (SE)";
        String locationLabel;
        if (affinity.sameCity()) {
            locationLabel = "Mesma cidade · " + candidate.cityName();
        } else if (affinity.sameRegion()) {
            locationLabel = "Região próxima · " + candidate.cityName();
        } else {
            locationLabel = cityWithState;
        }

        return new DiscoveryProfileResponse(
                candidate.userId(),
                candidate.userId(),
                profile.getId(),
                profile.getDisplayName(),
                profile.getFirstName(),
                candidate.age(),
                candidate.cityName(),
                cityWithState,
                null, // SEC-MED-04: minimização LGPD no feed pré-match (oculta neighborhood, mantém apenas city)
                locationLabel,
                candidate.goal(),
                profile.getBio(),
                candidate.avatarUrl(),
                profile.isVerifiedBadge50plus(),
                profile.isVerifiedBadge50plus(),
                hobbyNames,
                hobbySlugs,
                sharedNames,
                sharedSlugs,
                sharedNames.size(),
                affinity.affinityPercent(),
                affinity.sameCity(),
                affinity.sameRegion(),
                affinity.distanceKm()
        );
    }

    private String resolveGoal(Profile profile, Map<Short, ConnectionIntent> intentById) {
        if (profile == null || profile.getId() == null) {
            return "Amizade";
        }
        List<Short> intentIds = profileIntentRepository.findIntentIdsByProfileId(profile.getId());
        if (intentIds.isEmpty()) {
            return "Amizade";
        }
        Short firstIntentId = intentIds.get(0);
        ConnectionIntent intent = intentById != null
                ? intentById.get(firstIntentId)
                : connectionIntentRepository.findById(firstIntentId).orElse(null);
        if (intent == null || intent.getCode() == null) {
            return "Amizade";
        }
        return switch (intent.getCode().toUpperCase(Locale.ROOT)) {
            case "RELATIONSHIP" -> "Relacionamento";
            case "COMPANIONSHIP" -> "Companhia";
            default -> "Amizade";
        };
    }

    private String resolveAvatarUrl(Profile profile) {
        if (profile == null || profile.getId() == null) {
            return null;
        }
        return profilePhotoRepository.findByProfileIdAndPosition(profile.getId(), (short) 1)
                .filter(photo -> "ACTIVE".equalsIgnoreCase(photo.getStatus()))
                .map(ProfilePhoto::getObjectKey)
                .map(avatarService::buildAvatarUrl)
                .orElse(null);
    }

    private Double calculateDistanceKm(City cityA, City cityB) {
        if (cityA == null || cityB == null) {
            return null;
        }
        if (cityA.getId().equals(cityB.getId())) {
            return 0.0;
        }
        if (cityA.getLatitude() == null || cityA.getLongitude() == null
                || cityB.getLatitude() == null || cityB.getLongitude() == null) {
            return null;
        }
        double lat1 = Math.toRadians(cityA.getLatitude().doubleValue());
        double lon1 = Math.toRadians(cityA.getLongitude().doubleValue());
        double lat2 = Math.toRadians(cityB.getLatitude().doubleValue());
        double lon2 = Math.toRadians(cityB.getLongitude().doubleValue());

        double dLat = lat2 - lat1;
        double dLon = lon2 - lon1;
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(EARTH_RADIUS_KM * c * 10.0) / 10.0;
    }

    private void enforceDefensiveModalConfirmation(MatchInteractionRequest request) {
        if (Boolean.FALSE.equals(request.confirmedViaModal())) {
            throw new BusinessException(
                    "DEFENSIVE_CONFIRMATION_REQUIRED",
                    "Confirme esta ação no modal de segurança (RF-06) para prosseguir.",
                    HttpStatus.BAD_REQUEST
            );
        }
    }

    private void acquirePairTransactionLock(UUID userA, UUID userB) {
        if (jdbcTemplate == null || !isPostgreSql()) {
            return;
        }
        String pairKey = userA.toString() + ":" + userB.toString();
        long lockKey = computeDeterministicLockKey(pairKey);
        jdbcTemplate.query("SELECT pg_advisory_xact_lock(?)", rs -> null, lockKey);
    }

    private boolean isPostgreSql() {
        Boolean cached = postgreSqlCached;
        if (cached != null) {
            return cached;
        }
        boolean detected = Boolean.TRUE.equals(jdbcTemplate.execute((ConnectionCallback<Boolean>) conn -> {
            String productName = conn.getMetaData().getDatabaseProductName();
            return productName != null && productName.toLowerCase(Locale.ROOT).contains("postgresql");
        }));
        postgreSqlCached = detected;
        return detected;
    }

    private long computeDeterministicLockKey(String pairKey) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(pairKey.getBytes(StandardCharsets.UTF_8));
            return ByteBuffer.wrap(digest).getLong();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 indisponível na JVM.", ex);
        }
    }

    private int calculateAge(LocalDate birthDate) {
        if (birthDate == null) {
            return 0;
        }
        return Period.between(birthDate, LocalDate.now(AgeValidator.SERGIPE_ZONE)).getYears();
    }

    private String normalizeCityFilter(String cityFilter) {
        if (cityFilter == null || cityFilter.isBlank()) {
            return null;
        }
        String cleaned = cityFilter
                .replaceAll("(?i)\\s*\\(\\s*se\\s*\\)", "")
                .replaceAll("(?i)\\s*[-,/]\\s*(se|sergipe)\\b", "")
                .trim();
        String normalized = normalizeText(cleaned);
        if (normalized.isEmpty() || normalized.equals("todas") || normalized.equals("all")) {
            return null;
        }
        return normalized;
    }

    private String normalizeGoalFilter(String goalFilter) {
        if (goalFilter == null || goalFilter.isBlank()) {
            return null;
        }
        String normalized = normalizeText(goalFilter);
        if (normalized.isEmpty() || normalized.equals("todos") || normalized.equals("all")) {
            return null;
        }
        return switch (normalized) {
            case "relationship" -> "relacionamento";
            case "companionship" -> "companhia";
            case "friendship" -> "amizade";
            default -> normalized;
        };
    }

    private Set<Integer> resolveFilterHobbyIds(List<String> hobbyFilters, Map<Integer, Hobby> hobbyById) {
        if (hobbyFilters == null || hobbyFilters.isEmpty()) {
            return Set.of();
        }
        Set<Integer> matched = new HashSet<>();
        for (String raw : hobbyFilters) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            for (String token : raw.split(",")) {
                String clean = token.trim();
                if (clean.isEmpty()) {
                    continue;
                }
                Integer numericId = tryParseInt(clean);
                if (numericId != null && hobbyById.containsKey(numericId)) {
                    matched.add(numericId);
                    continue;
                }
                String normalized = normalizeText(clean);
                String slugCandidate = normalized.replace(' ', '-').replace('_', '-');
                for (Hobby h : hobbyById.values()) {
                    if ((h.getName() != null && normalizeText(h.getName()).equals(normalized))
                            || (h.getCode() != null && normalizeText(h.getCode()).equals(normalized))
                            || (h.getSlug() != null && normalizeText(h.getSlug()).replace('_', '-').equals(slugCandidate))
                            || (h.getCode() != null && normalizeText(h.getCode()).replace('_', '-').equals(slugCandidate))) {
                        matched.add(h.getId());
                    }
                }
            }
        }
        // Se o cliente enviou filtro de hobby mas nenhum hobby do catálogo correspondeu,
        // retorna sentinela (-1) para não vazar perfis fora do filtro.
        if (matched.isEmpty() && hobbyFilters.stream().anyMatch(s -> s != null && !s.isBlank())) {
            return Set.of(-1);
        }
        return matched;
    }

    private Integer tryParseInt(String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static String normalizeText(String input) {
        if (input == null) {
            return "";
        }
        return Normalizer.normalize(input.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }

    private record UserContext(
            UUID userId,
            int age,
            City city,
            String cityName,
            String neighborhoodName,
            String goal,
            Set<Integer> hobbyIds,
            String avatarUrl
    ) {
    }

    private record AffinityScore(
            int affinityPercent,
            List<Hobby> sharedHobbies,
            boolean sameCity,
            boolean sameRegion,
            Double distanceKm
    ) {
    }

    private record AffinitySummary(
            int affinityPercent,
            BigDecimal affinityDecimal,
            List<String> sharedHobbyNames,
            DiscoveryProfileResponse targetProfileDto
    ) {
    }

    private record ScoredCandidateInternal(
            DiscoveryProfileResponse response,
            OffsetDateTime updatedAt
    ) {
    }
}
