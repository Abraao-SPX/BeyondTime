package br.com.beyondtime.chat.service;

import br.com.beyondtime.auth.domain.User;
import br.com.beyondtime.auth.repository.UserRepository;
import br.com.beyondtime.chat.domain.ChatMatch;
import br.com.beyondtime.chat.domain.Conversation;
import br.com.beyondtime.chat.domain.UserChatKey;
import br.com.beyondtime.chat.dto.ConversationSummaryResponse;
import br.com.beyondtime.chat.dto.EncryptedMessageResponse;
import br.com.beyondtime.chat.repository.ChatMatchRepository;
import br.com.beyondtime.chat.repository.ChatUserBlockRepository;
import br.com.beyondtime.chat.repository.ConversationRepository;
import br.com.beyondtime.chat.repository.EncryptedMessageRepository;
import br.com.beyondtime.chat.repository.UserChatKeyRepository;
import br.com.beyondtime.location.domain.City;
import br.com.beyondtime.location.repository.CityRepository;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class ChatConversationService {

    private final ChatMatchRepository chatMatchRepository;
    private final ConversationRepository conversationRepository;
    private final EncryptedMessageRepository encryptedMessageRepository;
    private final UserChatKeyRepository userChatKeyRepository;
    private final ChatUserBlockRepository chatUserBlockRepository;
    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final ProfilePhotoRepository profilePhotoRepository;
    private final ProfileHobbyRepository profileHobbyRepository;
    private final HobbyRepository hobbyRepository;
    private final ProfileIntentRepository profileIntentRepository;
    private final ConnectionIntentRepository connectionIntentRepository;
    private final CityRepository cityRepository;
    private final AvatarService avatarService;

    public ChatConversationService(
            ChatMatchRepository chatMatchRepository,
            ConversationRepository conversationRepository,
            EncryptedMessageRepository encryptedMessageRepository,
            UserChatKeyRepository userChatKeyRepository,
            ChatUserBlockRepository chatUserBlockRepository,
            UserRepository userRepository,
            ProfileRepository profileRepository,
            ProfilePhotoRepository profilePhotoRepository,
            ProfileHobbyRepository profileHobbyRepository,
            HobbyRepository hobbyRepository,
            ProfileIntentRepository profileIntentRepository,
            ConnectionIntentRepository connectionIntentRepository,
            CityRepository cityRepository,
            AvatarService avatarService) {
        this.chatMatchRepository = chatMatchRepository;
        this.conversationRepository = conversationRepository;
        this.encryptedMessageRepository = encryptedMessageRepository;
        this.userChatKeyRepository = userChatKeyRepository;
        this.chatUserBlockRepository = chatUserBlockRepository;
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.profilePhotoRepository = profilePhotoRepository;
        this.profileHobbyRepository = profileHobbyRepository;
        this.hobbyRepository = hobbyRepository;
        this.profileIntentRepository = profileIntentRepository;
        this.connectionIntentRepository = connectionIntentRepository;
        this.cityRepository = cityRepository;
        this.avatarService = avatarService;
    }

    @Transactional
    public ConversationSummaryResponse openOrCreateConversation(UUID currentUserId, UUID otherUserId) {
        if (currentUserId.equals(otherUserId)) {
            throw new BusinessException(
                    "SELF_CONVERSATION_NOT_ALLOWED",
                    "Não é possível iniciar uma conversa consigo mesmo.",
                    HttpStatus.BAD_REQUEST
            );
        }

        if (chatUserBlockRepository.existsBlockBetween(currentUserId, otherUserId)) {
            throw new BusinessException(
                    "CONTACT_BLOCKED",
                    "Esta conversa está indisponível devido a um bloqueio ativo.",
                    HttpStatus.FORBIDDEN
            );
        }

        boolean currentActive = userRepository.findById(currentUserId)
                .map(User::isActive)
                .orElse(false);
        boolean otherActive = userRepository.findById(otherUserId)
                .map(User::isActive)
                .orElse(false);

        UUID userA = currentUserId.toString().compareTo(otherUserId.toString()) < 0 ? currentUserId : otherUserId;
        UUID userB = currentUserId.toString().compareTo(otherUserId.toString()) < 0 ? otherUserId : currentUserId;

        ChatMatch match = (currentActive && otherActive)
                ? chatMatchRepository.findByPair(userA, userB)
                        .filter(m -> "ACTIVE".equalsIgnoreCase(m.getStatus()))
                        .orElse(null)
                : null;

        if (match == null) {
            throw new BusinessException(
                    "CONVERSATION_NOT_ALLOWED",
                    "Você precisa ter uma conexão ativa com esta pessoa para iniciar a conversa.",
                    HttpStatus.FORBIDDEN
            );
        }

        Conversation conversation = conversationRepository.findByMatchId(match.getId())
                .orElseGet(() -> {
                    try {
                        return conversationRepository.saveAndFlush(new Conversation(match.getId()));
                    } catch (DataIntegrityViolationException ex) {
                        return conversationRepository.findByMatchId(match.getId()).orElseThrow(() -> ex);
                    }
                });

        return buildSummary(currentUserId, match, conversation);
    }

    @Transactional(readOnly = true)
    public List<ConversationSummaryResponse> listMyConversations(UUID currentUserId) {
        List<ChatMatch> activeMatches = chatMatchRepository.findActiveMatchesForUser(currentUserId);
        List<ConversationSummaryResponse> summaries = new ArrayList<>();

        for (ChatMatch match : activeMatches) {
            UUID otherUserId = match.getOtherUserId(currentUserId);
            if (chatUserBlockRepository.existsBlockBetween(currentUserId, otherUserId)) {
                continue;
            }
            Optional<Conversation> convOpt = conversationRepository.findByMatchId(match.getId());
            if (convOpt.isEmpty() || !"ACTIVE".equalsIgnoreCase(convOpt.get().getStatus())) {
                continue;
            }
            summaries.add(buildSummary(currentUserId, match, convOpt.get()));
        }

        summaries.sort(Comparator.comparing(
                ConversationSummaryResponse::updatedAt,
                Comparator.nullsLast(Comparator.reverseOrder())
        ));

        return summaries;
    }

    @Transactional(readOnly = true)
    public ConversationParticipants validateParticipationAndAccess(UUID conversationId, UUID currentUserId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversa", conversationId));

        ChatMatch match = chatMatchRepository.findById(conversation.getMatchId())
                .orElseThrow(() -> new ResourceNotFoundException("Conexão", conversation.getMatchId()));

        if (!match.involves(currentUserId)) {
            throw new BusinessException(
                    "CONVERSATION_ACCESS_DENIED",
                    "Você não tem permissão para acessar esta conversa.",
                    HttpStatus.FORBIDDEN
            );
        }

        UUID otherUserId = match.getOtherUserId(currentUserId);
        if (chatUserBlockRepository.existsBlockBetween(currentUserId, otherUserId)) {
            throw new BusinessException(
                    "CONTACT_BLOCKED",
                    "Conversa indisponível devido a bloqueio ativo.",
                    HttpStatus.FORBIDDEN
            );
        }

        if (!"ACTIVE".equalsIgnoreCase(conversation.getStatus()) || !"ACTIVE".equalsIgnoreCase(match.getStatus())) {
            throw new BusinessException(
                    "CONVERSATION_INACTIVE",
                    "Esta conversa foi congelada ou encerrada.",
                    HttpStatus.FORBIDDEN
            );
        }

        return new ConversationParticipants(conversation, match, currentUserId, otherUserId);
    }

    private ConversationSummaryResponse buildSummary(UUID currentUserId, ChatMatch match, Conversation conversation) {
        UUID contactId = match.getOtherUserId(currentUserId);

        Optional<Profile> profileOpt = profileRepository.findByUserId(contactId);
        Optional<User> userOpt = userRepository.findById(contactId);
        Optional<UserChatKey> keyOpt = userChatKeyRepository.findById(contactId);

        String contactName = profileOpt.map(Profile::getDisplayName)
                .orElseGet(() -> userOpt.map(User::getEmail).orElse("Contato BeyondTime"));

        Integer contactAge = userOpt.map(User::getBirthDate)
                .map(birthDate -> Period.between(birthDate, LocalDate.now()).getYears())
                .orElse(null);

        String contactCity = profileOpt.map(Profile::getCityId)
                .flatMap(cityRepository::findById)
                .map(City::getName)
                .orElse("Sergipe");

        String avatarUrl = profileOpt
                .flatMap(p -> profilePhotoRepository.findByProfileIdAndPosition(p.getId(), (short) 1))
                .filter(photo -> "ACTIVE".equalsIgnoreCase(photo.getStatus()))
                .map(ProfilePhoto::getObjectKey)
                .map(avatarService::buildAvatarUrl)
                .orElse(null);

        String contactGoal = resolveContactGoal(profileOpt.orElse(null));
        boolean contactVerified = profileOpt.map(Profile::isVerifiedBadge50plus).orElse(false);
        int affinityPercent = match.getAffinityPercentage() != null
                ? match.getAffinityPercentage().setScale(0, RoundingMode.HALF_UP).intValue()
                : 85;
        List<String> sharedHobbies = resolveSharedHobbies(currentUserId, profileOpt.orElse(null));

        long unreadCount = encryptedMessageRepository.countByConversationIdAndRecipientIdAndReadAtIsNull(
                conversation.getId(), currentUserId
        );

        EncryptedMessageResponse lastMessage = encryptedMessageRepository
                .findTopByConversationIdOrderBySentAtDesc(conversation.getId())
                .map(EncryptedMessageResponse::from)
                .orElse(null);

        return new ConversationSummaryResponse(
                conversation.getId(),
                match.getId(),
                contactId,
                contactName,
                contactAge,
                contactCity,
                avatarUrl,
                contactGoal,
                contactVerified,
                affinityPercent,
                sharedHobbies,
                keyOpt.isPresent(),
                keyOpt.map(UserChatKey::getPublicKeyJwk).orElse(null),
                keyOpt.map(UserChatKey::getKeyVersion).orElse(null),
                unreadCount,
                lastMessage,
                conversation.getUpdatedAt()
        );
    }

    private String resolveContactGoal(Profile profile) {
        if (profile == null || profile.getId() == null) {
            return "Amizade";
        }
        List<Short> intentIds = profileIntentRepository.findIntentIdsByProfileId(profile.getId());
        if (intentIds.isEmpty()) {
            return "Amizade";
        }
        return connectionIntentRepository.findById(intentIds.get(0))
                .map(ci -> switch (ci.getCode().toUpperCase(Locale.ROOT)) {
                    case "RELATIONSHIP" -> "Relacionamento";
                    case "COMPANIONSHIP" -> "Companhia";
                    default -> "Amizade";
                })
                .orElse("Amizade");
    }

    private List<String> resolveSharedHobbies(UUID currentUserId, Profile contactProfile) {
        if (contactProfile == null || contactProfile.getId() == null) {
            return List.of();
        }
        Optional<Profile> myProfileOpt = profileRepository.findByUserId(currentUserId);
        if (myProfileOpt.isEmpty()) {
            return List.of();
        }
        Set<Integer> myHobbyIds = new HashSet<>(profileHobbyRepository.findHobbyIdsByProfileId(myProfileOpt.get().getId()));
        if (myHobbyIds.isEmpty()) {
            return List.of();
        }
        List<Integer> sharedIds = profileHobbyRepository.findHobbyIdsByProfileId(contactProfile.getId())
                .stream()
                .filter(myHobbyIds::contains)
                .toList();
        if (sharedIds.isEmpty()) {
            return List.of();
        }
        return hobbyRepository.findAllById(sharedIds).stream()
                .map(Hobby::getName)
                .toList();
    }

    public record ConversationParticipants(
            Conversation conversation,
            ChatMatch match,
            UUID currentUserId,
            UUID otherUserId
    ) {
    }
}
