package ai.kolate.api_gateway.util;

import ai.kolate.api_gateway.config.Auth0Properties;
import com.auth0.jwk.JwkProvider;
import com.auth0.jwk.JwkProviderBuilder;
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.interfaces.JWTVerifier;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.interfaces.RSAPublicKey;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class JwtUtilService {

    private final Auth0Properties auth0Properties;
    private final JwkProvider jwkProvider;

    public JwtUtilService(Auth0Properties auth0Properties) {
        this.auth0Properties = auth0Properties;
        this.jwkProvider = new JwkProviderBuilder(auth0Properties.getDomain())
                .cached(10, 24, TimeUnit.HOURS)
                .rateLimited(10, 1, TimeUnit.MINUTES)
                .build();
    }

    public Optional<DecodedJWT> validateToken(String token) {
        try {
            DecodedJWT jwt = JWT.decode(token);
            String keyId = jwt.getKeyId();

            if (keyId == null) {
                log.warn("JWT token is missing 'kid' (Key ID).");
                return Optional.empty();
            }

            RSAPublicKey publicKey;
            try {
                publicKey = (RSAPublicKey) jwkProvider.get(keyId).getPublicKey();
            } catch (Exception e) {
                log.error("Failed to fetch JWK for key ID '{}': {}", keyId, e.getMessage());
                return Optional.empty();
            }

            if (publicKey == null) {
                log.error("Public key is null for key ID '{}'", keyId);
                return Optional.empty();
            }

            Algorithm algorithm = Algorithm.RSA256(publicKey, null);
            JWTVerifier verifier = JWT.require(algorithm)
                    .withIssuer(auth0Properties.getIssuer())
                    .withAudience(auth0Properties.getAudience())
                    .build();

            return Optional.of(verifier.verify(token));

        } catch (JWTVerificationException e) {
            log.error("JWT verification failed: {}", e.getMessage());
        } catch (Exception e) {
            log.error("Error validating JWT token: {}", e.getMessage());
        }

        return Optional.empty();
    }

    public String extractUserId(DecodedJWT jwt) {
        // Try "sub" (default) and fallback to "user_id"
        String userId = jwt.getClaim("sub").asString();
        if (userId == null || userId.isEmpty()) {
            userId = jwt.getClaim("user_id").asString();
        }

        return userId != null ? userId : "unknown";
    }

    public String extractOrganizationId(DecodedJWT jwt) {
        // Try "sub" (default) and fallback to "user_id"
        String orgId = jwt.getClaim("org_id").asString();
        return orgId != null ? orgId : "unknown";
    }

}
