package br.com.beyondtime.auth.repository;

import br.com.beyondtime.auth.domain.OAuthProvider;
import br.com.beyondtime.auth.domain.UserOAuthAccount;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserOAuthAccountRepository extends JpaRepository<UserOAuthAccount, UUID> {

    @EntityGraph(attributePaths = "user")
    Optional<UserOAuthAccount> findByProviderAndProviderUserId(OAuthProvider provider, String providerUserId);

    boolean existsByUserIdAndProvider(UUID userId, OAuthProvider provider);
}
