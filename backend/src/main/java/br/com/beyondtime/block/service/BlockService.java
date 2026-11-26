package br.com.beyondtime.block.service;

import br.com.beyondtime.auth.domain.User;
import br.com.beyondtime.auth.repository.UserRepository;
import br.com.beyondtime.block.dto.BlockedContactResponse;
import br.com.beyondtime.block.dto.CreateBlockRequest;
import br.com.beyondtime.chat.domain.ChatMatch;
import br.com.beyondtime.chat.domain.ChatUserBlock;
import br.com.beyondtime.chat.domain.Conversation;
import br.com.beyondtime.chat.repository.ChatMatchRepository;
import br.com.beyondtime.chat.repository.ChatUserBlockRepository;
import br.com.beyondtime.chat.repository.ConversationRepository;
import br.com.beyondtime.discovery.repository.ProfileInteractionRepository;
import br.com.beyondtime.location.domain.City;
import br.com.beyondtime.location.repository.CityRepository;
import br.com.beyondtime.profile.domain.Profile;
import br.com.beyondtime.profile.domain.ProfilePhoto;
import br.com.beyondtime.profile.repository.ProfilePhotoRepository;
import br.com.beyondtime.profile.repository.ProfileRepository;
import br.com.beyondtime.profile.service.AvatarService;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.exception.ResourceNotFoundException;
import br.com.beyondtime.shared.util.XssSanitizer;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class BlockService {

    private final ChatUserBlockRepository blockRepository;
    private final ChatMatchRepository matchRepository;
    private final ConversationRepository conversationRepository;
    private final ProfileInteractionRepository interactionRepository;
    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final ProfilePhotoRepository profilePhotoRepository;
    private final CityRepository cityRepository;
    private final AvatarService avatarService;

    public BlockService(
            ChatUserBlockRepository blockRepository,
            ChatMatchRepository matchRepository,
            ConversationRepository conversationRepository,
            ProfileInteractionRepository interactionRepository,
            UserRepository userRepository,
            ProfileRepository profileRepository,
            ProfilePhotoRepository profilePhotoRepository,
            CityRepository cityRepository,
            AvatarService avatarService) {
        this.blockRepository = blockRepository;
        this.matchRepository = matchRepository;
        this.conversationRepository = conversationRepository;
        this.interactionRepository = interactionRepository;
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.profilePhotoRepository = profilePhotoRepository;
        this.cityRepository = cityRepository;
        this.avatarService = avatarService;
    }

    @Transactional
    public BlockedContactResponse blockUser(UUID blockerUserId, CreateBlockRequest request) {
        UUID blockedUserId = request.blockedUserId();
        if (blockerUserId.equals(blockedUserId)) {
            throw new BusinessException(
                    "SELF_BLOCK_NOT_ALLOWED",
                    "Não é possível bloquear o próprio perfil.",
                    HttpStatus.BAD_REQUEST
            );
        }

        if (!userRepository.existsById(blockedUserId)) {
            throw new ResourceNotFoundException("Usuário", blockedUserId);
        }

        String rawReason = request.reason();
        if (rawReason != null && XssSanitizer.containsMaliciousScript(rawReason)) {
            throw new BusinessException(
                    "XSS_PAYLOAD_DETECTED",
                    "Conteúdo não permitido detectado no motivo do bloqueio.",
                    HttpStatus.BAD_REQUEST
            );
        }
        String sanitizedReason = (rawReason != null && !rawReason.isBlank())
                ? XssSanitizer.sanitizeSingleLine(rawReason)
                : null;
        final String finalReason = (sanitizedReason != null && !sanitizedReason.isBlank())
                ? sanitizedReason
                : null;
        final boolean confirmedViaModal = request.confirmedViaModal() == null || request.confirmedViaModal();

        ChatUserBlock block = blockRepository.findByBlockerUserIdAndBlockedUserId(blockerUserId, blockedUserId)
                .map(existing -> {
                    if (finalReason != null) {
                        existing.updateReason(finalReason);
                        return blockRepository.save(existing);
                    }
                    return existing;
                })
                .orElseGet(() -> blockRepository.save(
                        new ChatUserBlock(blockerUserId, blockedUserId, confirmedViaModal, finalReason)
                ));

        // Ocultação e suspensão imediata do match/conversa no servidor (RF-08)
        UUID userA = blockerUserId.toString().compareTo(blockedUserId.toString()) < 0 ? blockerUserId : blockedUserId;
        UUID userB = blockerUserId.toString().compareTo(blockedUserId.toString()) < 0 ? blockedUserId : blockerUserId;
        matchRepository.findByPair(userA, userB).ifPresent(match -> {
            if ("ACTIVE".equalsIgnoreCase(match.getStatus())) {
                match.markStatus("BLOCKED");
                matchRepository.save(match);
            }
            conversationRepository.findByMatchId(match.getId()).ifPresent(conv -> {
                if ("ACTIVE".equalsIgnoreCase(conv.getStatus())) {
                    conv.markStatus("BLOCKED");
                    conversationRepository.save(conv);
                }
            });
        });

        return toResponse(block);
    }

    @Transactional(readOnly = true)
    public List<BlockedContactResponse> listBlockedContacts(UUID blockerUserId) {
        List<ChatUserBlock> blocks = blockRepository.findByBlockerUserIdOrderByCreatedAtDesc(blockerUserId);
        if (blocks.isEmpty()) {
            return List.of();
        }
        List<UUID> blockedIds = blocks.stream()
                .map(ChatUserBlock::getBlockedUserId)
                .distinct()
                .toList();
        Map<UUID, User> usersById = userRepository.findAllById(blockedIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity(), (a, b) -> a, HashMap::new));
        return blocks.stream()
                .map(block -> toResponse(block, Optional.ofNullable(usersById.get(block.getBlockedUserId()))))
                .toList();
    }

    @Transactional
    public void unblockUser(UUID blockerUserId, UUID targetOrBlockId) {
        ChatUserBlock block = blockRepository.findByBlockerUserIdAndBlockedUserId(blockerUserId, targetOrBlockId)
                .or(() -> blockRepository.findByIdAndBlockerUserId(targetOrBlockId, blockerUserId))
                .orElseThrow(() -> new ResourceNotFoundException("Bloqueio", targetOrBlockId));

        UUID unblockedUserId = block.getBlockedUserId();
        blockRepository.delete(block);
        blockRepository.flush();

        // Privacidade RF-08: ao desbloquear, NÃO reabre automaticamente a conversa antiga;
        // marca o match anterior como UNMATCHED e a conversa como CLOSED, e limpa interações
        // anteriores para que o perfil volte a ser elegível no Discovery (RF-05).
        if (!blockRepository.existsBlockBetween(blockerUserId, unblockedUserId)) {
            UUID userA = blockerUserId.toString().compareTo(unblockedUserId.toString()) < 0 ? blockerUserId : unblockedUserId;
            UUID userB = blockerUserId.toString().compareTo(unblockedUserId.toString()) < 0 ? unblockedUserId : blockerUserId;
            matchRepository.findByPair(userA, userB).ifPresent(match -> {
                if ("BLOCKED".equalsIgnoreCase(match.getStatus())) {
                    match.markStatus("UNMATCHED");
                    matchRepository.save(match);
                }
                conversationRepository.findByMatchId(match.getId()).ifPresent(conv -> {
                    if ("BLOCKED".equalsIgnoreCase(conv.getStatus())) {
                        conv.markStatus("CLOSED");
                        conversationRepository.save(conv);
                    }
                });
            });
            interactionRepository.deleteAllBetweenUsers(blockerUserId, unblockedUserId);
        }
    }

    private BlockedContactResponse toResponse(ChatUserBlock block) {
        return toResponse(block, userRepository.findById(block.getBlockedUserId()));
    }

    private BlockedContactResponse toResponse(ChatUserBlock block, Optional<User> userOpt) {
        UUID blockedId = block.getBlockedUserId();
        Optional<Profile> profileOpt = profileRepository.findByUserId(blockedId);

        String fullName = profileOpt.map(Profile::getDisplayName)
                .orElse("Usuário BeyondTime");

        Integer age = userOpt.map(User::getBirthDate)
                .map(bd -> Period.between(bd, LocalDate.now(ZoneId.of("America/Maceio"))).getYears())
                .orElse(null);

        String city = profileOpt.map(Profile::getCityId)
                .flatMap(cityRepository::findById)
                .map(City::getName)
                .orElse("Sergipe");

        String avatarUrl = profileOpt
                .flatMap(p -> profilePhotoRepository.findByProfileIdAndPosition(p.getId(), (short) 1))
                .filter(photo -> "ACTIVE".equalsIgnoreCase(photo.getStatus()))
                .map(ProfilePhoto::getObjectKey)
                .map(avatarService::buildAvatarUrl)
                .orElse(null);

        boolean verified = profileOpt.map(Profile::isVerifiedBadge50plus).orElse(false);

        return new BlockedContactResponse(
                block.getId(),
                blockedId,
                blockedId,
                fullName,
                age,
                city,
                avatarUrl,
                verified,
                block.getReason(),
                block.getCreatedAt()
        );
    }
}
