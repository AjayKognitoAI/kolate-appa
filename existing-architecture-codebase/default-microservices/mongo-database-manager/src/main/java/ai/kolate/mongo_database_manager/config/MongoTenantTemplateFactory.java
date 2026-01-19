package ai.kolate.mongo_database_manager.config;

import com.mongodb.client.MongoDatabase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * Factory class for creating tenant-aware MongoDB templates and databases.
 * This provides a convenient way to get the correct MongoDB resources for the current tenant.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MongoTenantTemplateFactory {

    private final MongoDatasourceResolver mongoDatasourceResolver;
    private final MongoTenantContext mongoTenantContext;

    /**
     * Get the MongoTemplate for the current tenant.
     * Uses the tenant ID from the current thread's context.
     *
     * @return The MongoTemplate for the current tenant
     */
    public MongoTemplate getCurrentTenantTemplate() {
        String tenantId = mongoTenantContext.getTenantId();
        log.debug("Getting MongoTemplate for current tenant: {}", tenantId);
        return mongoDatasourceResolver.resolveMongoTemplate(tenantId);
    }

    /**
     * Get the MongoDatabase for the current tenant.
     * Uses the tenant ID from the current thread's context.
     *
     * @return The MongoDatabase for the current tenant
     */
    public MongoDatabase getCurrentTenantDatabase() {
        String tenantId = mongoTenantContext.getTenantId();
        log.debug("Getting MongoDatabase for current tenant: {}", tenantId);
        return mongoDatasourceResolver.resolveMongoDatabase(tenantId);
    }

    /**
     * Get the MongoTemplate for a specific tenant.
     *
     * @param tenantId The tenant/organization ID
     * @return The MongoTemplate for the specified tenant
     */
    public MongoTemplate getTemplateForTenant(String tenantId) {
        log.debug("Getting MongoTemplate for specific tenant: {}", tenantId);
        return mongoDatasourceResolver.resolveMongoTemplate(tenantId);
    }

    /**
     * Get the MongoDatabase for a specific tenant.
     *
     * @param tenantId The tenant/organization ID
     * @return The MongoDatabase for the specified tenant
     */
    public MongoDatabase getDatabaseForTenant(String tenantId) {
        log.debug("Getting MongoDatabase for specific tenant: {}", tenantId);
        return mongoDatasourceResolver.resolveMongoDatabase(tenantId);
    }

    /**
     * Execute a MongoDB operation with a specific tenant context.
     * This temporarily switches the tenant context for the duration of the operation.
     *
     * @param tenantId The target tenant ID
     * @param operation The operation to execute
     * @param <T> The return type of the operation
     * @return The result of the operation
     */
    public <T> T executeWithTenant(String tenantId, MongoOperation<T> operation) {
        String originalTenantId = mongoTenantContext.getTenantId();
        try {
            log.debug("Temporarily switching to tenant: {} for operation", tenantId);
            mongoTenantContext.setTenantId(tenantId);
            MongoTemplate template = getCurrentTenantTemplate();
            return operation.execute(template);
        } finally {
            log.debug("Restoring original tenant: {}", originalTenantId);
            mongoTenantContext.setTenantId(originalTenantId);
        }
    }

    /**
     * Functional interface for MongoDB operations.
     *
     * @param <T> The return type of the operation
     */
    @FunctionalInterface
    public interface MongoOperation<T> {
        T execute(MongoTemplate mongoTemplate);
    }
}
