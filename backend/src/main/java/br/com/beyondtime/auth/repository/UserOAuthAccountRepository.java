package br.com.beyondtime.auth.repository;

import br.com.beyondtime.auth.domain.OAuthProvider;
import br.com.beyondtime.auth.domain.UserOAuthAccount;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserOAuthAccountRepository extends JpaRepository<UserOAuthAccount, UUID> {

    @EntityGraph(attributePaths = "user")
    Optional<UserOAuthAccount> findByProviderAndProviderUserId(OAuthProvider provider, String providerUserId);

    boolean existsByUserIdAndProvider(UUID userId, OAuthProvider provider);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM UserOAuthAccount uoa WHERE uoa.user.id = :userId")
    int deleteAllByUserId(@Param("userId") UUID userId);
}
