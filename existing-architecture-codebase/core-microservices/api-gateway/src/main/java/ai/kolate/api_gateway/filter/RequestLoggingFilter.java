package ai.kolate.api_gateway.filter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.util.Collections;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Global filter for logging all requests coming into the API Gateway
 */
@Component
@Slf4j
public class RequestLoggingFilter implements GlobalFilter, Ordered {
    
    private static final String REQUEST_ID_ATTRIBUTE = "requestId";
    private static final String START_TIME_ATTRIBUTE = "startTime";
    private static final String BEARER_PREFIX = "Bearer ";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String requestId = UUID.randomUUID().toString();
        
        // Store request start time and ID
        exchange.getAttributes().put(REQUEST_ID_ATTRIBUTE, requestId);
        exchange.getAttributes().put(START_TIME_ATTRIBUTE, System.currentTimeMillis());
        
        // Get request details
        String path = request.getURI().getPath();
        String query = request.getURI().getQuery();
        String fullPath = query != null ? path + "?" + query : path;
        String method = request.getMethod().name();
        String clientIp = request.getRemoteAddress() != null ? 
            request.getRemoteAddress().getAddress().getHostAddress() : "unknown";
            
        // Get route information (if available)
        Route route = exchange.getAttribute(ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR);
        String routeId = route != null ? route.getId() : "unknown";
        URI routeUri = route != null ? route.getUri() : null;
        
        // Log request
        // Extract token (if any)
        String tokenPayload = null;
        String authHeader = request.getHeaders().getFirst("Authorization");

        if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
            try {
                tokenPayload = authHeader.substring(BEARER_PREFIX.length()).split("\\.")[1];
            } catch (Exception e) {
                log.warn("Malformed Authorization token for request [{}] {} {}", requestId, method, fullPath);
            }
        }

        // Log with or without token
        if (tokenPayload != null) {
            log.info("Request: [{}] {} {} from IP: {} - with Bearer: {} - Route: {} -> {}",
                    requestId, method, fullPath, clientIp, tokenPayload, routeId, routeUri);
        } else {
            log.info("Request: [{}] {} {} from IP: {} - Route: {} -> {}",
                    requestId, method, fullPath, clientIp, routeId, routeUri);
        }
        
        // Continue the filter chain and log response details on completion
        return chain.filter(exchange)
            .then(Mono.fromRunnable(() -> {
                ServerHttpResponse response = exchange.getResponse();
                Long startTime = exchange.getAttribute(START_TIME_ATTRIBUTE);
                long duration = System.currentTimeMillis() - startTime;
                
                // Log basic response info
                log.info("Response: [{}] {} {} - Status: {} - Duration: {}ms", 
                        requestId, method, fullPath, 
                        response.getStatusCode(), duration);

                // Log errors at error level
                if (response.getStatusCode() != null && response.getStatusCode().isError()) {
                    log.error("Request failed: [{}] {} {} - Status: {}", 
                            requestId, method, fullPath, response.getStatusCode());
                }
            }));
    }

    @Override
    public int getOrder() {
        // Set to highest priority to ensure this runs first
        return -9999;
    }
}