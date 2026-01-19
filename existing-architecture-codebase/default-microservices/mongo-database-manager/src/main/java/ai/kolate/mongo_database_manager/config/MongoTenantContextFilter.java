package ai.kolate.mongo_database_manager.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filter that extracts tenant information from request headers and sets it in the MongoDB context.
 * This enables dynamic MongoDB datasource switching for each request.
 */
@Component
@Order(2) // Order 2 to run after SQL datasource filter if both are present
@RequiredArgsConstructor
@Slf4j
public class MongoTenantContextFilter extends OncePerRequestFilter {

    private static final String TENANT_HEADER = "org-id";
    private final MongoTenantContext mongoTenantContext;
    private final MongoDatasourceResolver mongoDatasourceResolver;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        log.info("Checking if MongoDB path should be filtered: {}", path);
        return false; // Filter all requests
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        log.info("MongoTenantContextFilter is being invoked for path: {}", request.getRequestURI());
        log.info("Request method: {}", request.getMethod());

        String organizationId = request.getHeader(TENANT_HEADER);

        try {
            if (organizationId != null && !organizationId.isEmpty()) {
                log.info("Setting MongoDB tenant context from header: {}", organizationId);
                mongoTenantContext.setTenantId(organizationId);

                // Eagerly resolve the MongoDB datasource to ensure it's available
                mongoDatasourceResolver.resolveMongoTemplate(organizationId);
            } else {
                log.info("No tenant specified in header '{}' for MongoDB, using default", TENANT_HEADER);
                mongoTenantContext.setTenantId("default");
            }

            filterChain.doFilter(request, response);
        } finally {
            // Always clear the context to prevent leaks between requests
            mongoTenantContext.clear();
            log.info("MongoTenantContextFilter completed and context cleared");
        }
    }
}
