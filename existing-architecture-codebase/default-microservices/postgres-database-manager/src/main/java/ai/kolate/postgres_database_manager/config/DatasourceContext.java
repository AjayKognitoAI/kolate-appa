package ai.kolate.postgres_database_manager.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Stores the tenant context for the current thread.
 * This enables the dynamic datasource routing mechanism.
 */
@Component
@Slf4j
public class DatasourceContext {

    private static final ThreadLocal<String> CONTEXT = new ThreadLocal<>();

    /**
     * Set the current tenant ID.
     *
     * @param tenantId The organization ID acting as tenant ID
     */
    public void setTenantId(String tenantId) {
        log.debug("Setting tenant ID: {}", tenantId);
        CONTEXT.set(tenantId);
    }

    /**
     * Get the current tenant ID.
     *
     * @return The current tenant ID or "default" if not set
     */
    public String getTenantId() {
        String tenantId = CONTEXT.get();
        if (tenantId == null) {
            log.debug("No tenant ID found, using default");
            return "default";
        }
        log.debug("Getting tenant ID: {}", tenantId);
        return tenantId;
    }

    /**
     * Clear the current tenant context.
     * Should be called at the end of each request to prevent leaks.
     */
    public void clear() {
        log.debug("Clearing tenant context");
        CONTEXT.remove();
    }
}
