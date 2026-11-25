package br.com.beyondtime.discovery.dto;

import java.util.List;
import java.util.UUID;

public record DiscoveryProfileResponse(
        UUID id,
        UUID userId,
        UUID profileId,
        String fullName,
        String firstName,
        Integer age,
        String city,
        String cityWithState,
        String neighborhood,
        String locationLabel,
        String goal,
        String bio,
        String avatarUrl,
        boolean verifiedBadge50plus,
        boolean verifiedIdentity,
        List<String> hobbies,
        List<String> hobbySlugs,
        List<String> sharedHobbies,
        List<String> sharedHobbySlugs,
        int sharedHobbiesCount,
        int affinityPercent,
        boolean sameCity,
        boolean sameRegion,
        Double distanceKm
) {
}
