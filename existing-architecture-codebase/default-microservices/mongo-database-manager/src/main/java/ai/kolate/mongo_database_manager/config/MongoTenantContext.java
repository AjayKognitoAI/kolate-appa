package ai.kolate.mongo_database_manager.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Stores the MongoDB tenant context for the current thread.
 * This enables the dynamic MongoDB datasource routing mechanism.
 */
@Component
@Slf4j
public class MongoTenantContext {

    private static final ThreadLocal<String> CONTEXT = new ThreadLocal<>();

    /**
     * Set the current tenant ID for MongoDB operations.
     *
     * @param tenantId The organization ID acting as tenant ID
     */
    public void setTenantId(String tenantId) {
        log.debug("Setting MongoDB tenant ID: {}", tenantId);
        CONTEXT.set(tenantId);
    }

    /**
     * Get the current tenant ID for MongoDB operations.
     *
     * @return The current tenant ID or "default" if not set
     */
    public String getTenantId() {
        String tenantId = CONTEXT.get();
        if (tenantId == null) {
            log.debug("No MongoDB tenant ID found, using default");
            return "default";
        }
        log.debug("Getting MongoDB tenant ID: {}", tenantId);
        return tenantId;
    }

    /**
     * Clear the current MongoDB tenant context.
     * Should be called at the end of each request to prevent leaks.
     */
    public void clear() {
        log.debug("Clearing MongoDB tenant context");
        CONTEXT.remove();
    }
}
