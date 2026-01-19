package ai.kolate.api_gateway.filter;

import ai.kolate.api_gateway.util.JwtUtilService;
import com.auth0.jwt.interfaces.DecodedJWT;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private final JwtUtilService jwtUtilService;

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String USER_ID_HEADER = "user-id";
    private static final String ORG_ID_HEADER = "org-id";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        String method = request.getMethod().name();
        String clientIp = request.getRemoteAddress() != null ? 
            request.getRemoteAddress().getAddress().getHostAddress() : "unknown";
        
        log.info("Incoming request: {} {} from IP: {}", method, path, clientIp);

        if (path.startsWith("/external/") || path.startsWith("/public/")) {
            log.info("Skipping authentication for public endpoint: {}", path);
            return chain.filter(exchange);
        }

        // Skip processing if no Authorization header is present
        if (!request.getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
            log.warn("Authorization header missing for request: {} {}", method, path);
            return unauthorizedResponse(exchange, "Missing authorization header");
        }

        List<String> authHeaders = request.getHeaders().get(HttpHeaders.AUTHORIZATION);
        if (authHeaders == null || authHeaders.isEmpty()) {
            log.warn("Authorization header is empty for request: {} {}", method, path);
            return unauthorizedResponse(exchange, "Empty authorization header");
        }

        String authHeader = authHeaders.get(0);
        if (!authHeader.startsWith(BEARER_PREFIX)) {
            log.warn("Authorization header does not start with 'Bearer' for request: {} {}", method, path);
            return unauthorizedResponse(exchange, "Invalid authorization format");
        }

        // Extract the token
        String token = authHeader.substring(BEARER_PREFIX.length());
        // Log a masked version of the token for security (first 10 chars + last 4)
        String maskedToken = maskToken(token);
        log.debug("Processing token: {} for request: {} {}", maskedToken, method, path);

        // Validate and decode the token
        Optional<DecodedJWT> optionalJwt = jwtUtilService.validateToken(token);

        if (optionalJwt.isEmpty()) {
            log.warn("Invalid or expired JWT token for request: {} {}", method, path);
            return unauthorizedResponse(exchange, "Invalid or expired token");
        }

        DecodedJWT jwt = optionalJwt.get();
        String userId = jwtUtilService.extractUserId(jwt);
        String orgId = jwtUtilService.extractOrganizationId(jwt);
        
        log.info("Authenticated user: {} for request: {} {}", userId, method, path);

        // Add the user ID to the request headers
        ServerHttpRequest modifiedRequest = request.mutate()
                .header(USER_ID_HEADER, userId)
                .header(ORG_ID_HEADER, orgId)
                .build();

        return chain.filter(exchange.mutate().request(modifiedRequest).build())
            .doOnSuccess(result -> log.debug("Request processed successfully: {} {}", method, path))
            .doOnError(error -> {
                log.error("Error processing request: {} {} - Error: {}", method, path, error.getMessage(), error);
            });
    }

    @Override
    public int getOrder() {
        return -100; // High precedence
    }

    private Mono<Void> unauthorizedResponse(ServerWebExchange exchange, String errorMessage) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        String method = request.getMethod().name();
        
        log.error("Authentication failed: {} for request: {} {}", errorMessage, method, path);
        
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        return response.setComplete();
    }
    
    /**
     * Masks the token for secure logging
     * @param token The full token
     * @return A masked version showing only parts of the token
     */
    private String maskToken(String token) {
        if (token == null || token.length() <= 10) {
            return "***masked***";
        }
        
        // Show first 6 chars and last 4, mask the rest with asterisks
        return token.substring(0, 6) + "..." + token.substring(token.length() - 4);
    }
}