package ai.kolate.postgres_database_manager.filter;

import ai.kolate.postgres_database_manager.config.DatasourceContext;
import ai.kolate.postgres_database_manager.config.DatasourceResolver;
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
 * Filter that extracts tenant information from request headers and sets it in the context.
 * This enables dynamic datasource switching for each request.
 */
@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class TenantContextFilter extends OncePerRequestFilter {

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        log.info("Checking if path should be filtered: {}", path);
        return false; // Filter all requests
    }

    private static final String TENANT_HEADER = "org-id";
    private final DatasourceContext datasourceContext;
    private final DatasourceResolver datasourceResolver;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        log.info("TenantContextFilter is being invoked for path: {}", request.getRequestURI());
        log.info("Request method: {}", request.getMethod());
        
        String organizationId = request.getHeader(TENANT_HEADER);

        try {
            if (organizationId != null && !organizationId.isEmpty()) {
                log.info("Setting tenant context from header: {}", organizationId);
                datasourceContext.setTenantId(organizationId);

                // Eagerly resolve the datasource to ensure it's available
                datasourceResolver.resolveDatasource(organizationId);
            } else {
                log.info("No tenant specified in header '{}', using default", TENANT_HEADER);
                datasourceContext.setTenantId("default");
            }

            filterChain.doFilter(request, response);
        } finally {
            // Always clear the context to prevent leaks between requests
            datasourceContext.clear();
            log.info("TenantContextFilter completed and context cleared");
        }
    }
}
