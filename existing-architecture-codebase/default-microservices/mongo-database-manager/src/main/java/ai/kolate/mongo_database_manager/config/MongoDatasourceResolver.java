package ai.kolate.mongo_database_manager.config;

import ai.kolate.mongo_database_manager.service.MongoDatasourceService;
import com.mongodb.client.MongoDatabase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoTemplate;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Resolves MongoDB datasources at runtime based on tenant context.
 * Manages dynamic creation and caching of MongoDB templates and databases.
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class MongoDatasourceResolver {

    private final MongoDatasourceService mongoDatasourceService;

    // Local cache for quick access
    private final Map<String, MongoTemplate> mongoTemplateCache = new ConcurrentHashMap<>();
    private final Map<String, MongoDatabase> mongoDatabaseCache = new ConcurrentHashMap<>();

    /**
     * Resolve or create a MongoTemplate for the given organization ID.
     * If the template already exists, it is returned directly.
     * If not, a new template is created, registered, and returned.
     *
     * @param organizationId The organization ID
     * @return The resolved MongoTemplate
     */
    public MongoTemplate resolveMongoTemplate(String organizationId) {
        log.debug("Resolving MongoTemplate for organization: {}", organizationId);

        try {
            // Check local cache first
            MongoTemplate cachedTemplate = mongoTemplateCache.get(organizationId);
            if (cachedTemplate != null) {
                log.debug("Found cached MongoTemplate for organization: {}", organizationId);
                return cachedTemplate;
            }

            // Get or create the MongoDB template through the service
            MongoTemplate mongoTemplate = mongoDatasourceService.getMongoTemplateByOrganizationId(organizationId);

            // Cache the template locally for quick access
            mongoTemplateCache.put(organizationId, mongoTemplate);

            log.info("Resolved MongoTemplate for organization: {}", organizationId);
            return mongoTemplate;

        } catch (Exception e) {
            log.error("Error resolving MongoTemplate for organization: {}", organizationId, e);
            throw new RuntimeException("Failed to resolve MongoTemplate for organization: " + organizationId, e);
        }
    }

    /**
     * Resolve or create a MongoDatabase for the given organization ID.
     * If the database already exists, it is returned directly.
     * If not, a new database is created, registered, and returned.
     *
     * @param organizationId The organization ID
     * @return The resolved MongoDatabase
     */
    public MongoDatabase resolveMongoDatabase(String organizationId) {
        log.debug("Resolving MongoDatabase for organization: {}", organizationId);

        try {
            // Check local cache first
            MongoDatabase cachedDatabase = mongoDatabaseCache.get(organizationId);
            if (cachedDatabase != null) {
                log.debug("Found cached MongoDatabase for organization: {}", organizationId);
                return cachedDatabase;
            }

            // Get or create the MongoDB database through the service
            MongoDatabase mongoDatabase = mongoDatasourceService.getMongoDatabaseByOrganizationId(organizationId);

            // Cache the database locally for quick access
            mongoDatabaseCache.put(organizationId, mongoDatabase);

            log.info("Resolved MongoDatabase for organization: {}", organizationId);
            return mongoDatabase;

        } catch (Exception e) {
            log.error("Error resolving MongoDatabase for organization: {}", organizationId, e);
            throw new RuntimeException("Failed to resolve MongoDatabase for organization: " + organizationId, e);
        }
    }

    /**
     * Get the current MongoTemplate based on the tenant context.
     *
     * @return The MongoTemplate for the current tenant
     */
    public MongoTemplate getCurrentMongoTemplate() {
        // This would typically be called from a component that has access to MongoTenantContext
        // For now, we'll assume the organizationId is passed as parameter
        throw new UnsupportedOperationException("Use resolveMongoTemplate(organizationId) instead");
    }

    /**
     * Get the current MongoDatabase based on the tenant context.
     *
     * @return The MongoDatabase for the current tenant
     */
    public MongoDatabase getCurrentMongoDatabase() {
        // This would typically be called from a component that has access to MongoTenantContext
        // For now, we'll assume the organizationId is passed as parameter
        throw new UnsupportedOperationException("Use resolveMongoDatabase(organizationId) instead");
    }

    /**
     * Remove cached MongoDB resources for the given organization.
     *
     * @param organizationId The organization ID
     */
    public void evictCache(String organizationId) {
        log.info("Evicting MongoDB cache for organization: {}", organizationId);
        mongoTemplateCache.remove(organizationId);
        mongoDatabaseCache.remove(organizationId);
        mongoDatasourceService.removeMongoDatasource(organizationId);
    }
}
