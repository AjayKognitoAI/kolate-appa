package ai.kolate.auth_manager.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.oauth2.client.OAuth2AuthorizeRequest;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientManager;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

@Service
public class TokenService {
    private static final Logger logger = LoggerFactory.getLogger(TokenService.class);
    private static final String CACHE_NAME = "auth0Tokens";
    private static final String TOKEN_KEY = "auth0-mgmt";

    private final OAuth2AuthorizedClientManager authorizedClientManager;

    public TokenService(OAuth2AuthorizedClientManager authorizedClientManager) {
        this.authorizedClientManager = authorizedClientManager;
    }

    @Cacheable(value = CACHE_NAME, key = "'" + TOKEN_KEY + "'")
    public String getAccessToken() {
        logger.debug("Fetching new token from Auth0...");
        OAuth2AuthorizeRequest request = OAuth2AuthorizeRequest
                .withClientRegistrationId("auth0-mgmt")
                .principal("auth0-client")
                .build();

        OAuth2AuthorizedClient client = authorizedClientManager.authorize(request);

        if (client == null || client.getAccessToken() == null) {
            throw new IllegalStateException("Unable to retrieve access token");
        }

        String token = client.getAccessToken().getTokenValue();
        Instant expiresAt = client.getAccessToken().getExpiresAt();
        if (expiresAt != null) {
            long ttlSeconds = Duration.between(Instant.now(), expiresAt).getSeconds();
            logger.debug("Retrieved new token, expires in {} seconds", ttlSeconds);
        }

        return token;
    }

    /**
     * Force refresh the token before it expires to prevent using an expired token
     * This runs every 45 minutes (token TTL is 50 minutes)
     */
    @Scheduled(fixedRate = 45 * 60 * 1000) // 45 minutes
    @CacheEvict(value = CACHE_NAME, key = "'" + TOKEN_KEY + "'")
    public void refreshToken() {
        logger.debug("Evicting cached token to force refresh");
    }

    /**
     * Manual method to force token refresh when needed
     */
    @CacheEvict(value = CACHE_NAME, key = "'" + TOKEN_KEY + "'")
    public void forceTokenRefresh() {
        logger.debug("Manually evicting cached token");
    }
}
