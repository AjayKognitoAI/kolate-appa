package ai.kolate.mongo_database_manager.service;

import ai.kolate.mongo_database_manager.config.MongoTenantTemplateFactory;
import com.mongodb.client.MongoDatabase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

/**
 * Service for testing and managing MongoDB connections.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MongoConnectionService {

    private final MongoTenantTemplateFactory mongoTenantTemplateFactory;

    /**
     * Test MongoDB connection for the current tenant.
     *
     * @return true if connection is successful, false otherwise
     */
    public boolean testCurrentTenantConnection() {
        try {
            MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
            return testConnection(mongoTemplate);
        } catch (Exception e) {
            log.error("Failed to test current tenant MongoDB connection", e);
            return false;
        }
    }

    /**
     * Test MongoDB connection for a specific tenant.
     *
     * @param tenantId The tenant/organization ID
     * @return true if connection is successful, false otherwise
     */
    public boolean testTenantConnection(String tenantId) {
        try {
            MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getTemplateForTenant(tenantId);
            return testConnection(mongoTemplate);
        } catch (Exception e) {
            log.error("Failed to test MongoDB connection for tenant: {}", tenantId, e);
            return false;
        }
    }

    /**
     * Get database information for the current tenant.
     *
     * @return MongoDB database information
     */
    public MongoConnectionInfo getCurrentTenantConnectionInfo() {
        try {
            MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
            MongoDatabase database = mongoTenantTemplateFactory.getCurrentTenantDatabase();
            
            return MongoConnectionInfo.builder()
                    .connected(testConnection(mongoTemplate))
                    .databaseName(database.getName())
                    .collectionCount(database.listCollectionNames().into(new java.util.ArrayList<>()).size())
                    .build();
        } catch (Exception e) {
            log.error("Failed to get current tenant connection info", e);
            return MongoConnectionInfo.builder()
                    .connected(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    /**
     * Get database information for a specific tenant.
     *
     * @param tenantId The tenant/organization ID
     * @return MongoDB database information
     */
    public MongoConnectionInfo getTenantConnectionInfo(String tenantId) {
        try {
            MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getTemplateForTenant(tenantId);
            MongoDatabase database = mongoTenantTemplateFactory.getDatabaseForTenant(tenantId);
            
            return MongoConnectionInfo.builder()
                    .connected(testConnection(mongoTemplate))
                    .databaseName(database.getName())
                    .collectionCount(database.listCollectionNames().into(new java.util.ArrayList<>()).size())
                    .tenantId(tenantId)
                    .build();
        } catch (Exception e) {
            log.error("Failed to get connection info for tenant: {}", tenantId, e);
            return MongoConnectionInfo.builder()
                    .connected(false)
                    .tenantId(tenantId)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    /**
     * Test a MongoDB connection using the provided template.
     *
     * @param mongoTemplate The MongoTemplate to test
     * @return true if connection is successful, false otherwise
     */
    private boolean testConnection(MongoTemplate mongoTemplate) {
        try {
            // Simple test: get database name
            String databaseName = mongoTemplate.getDb().getName();
            log.debug("Successfully connected to MongoDB database: {}", databaseName);
            return true;
        } catch (Exception e) {
            log.warn("MongoDB connection test failed", e);
            return false;
        }
    }

    /**
     * Data class for MongoDB connection information.
     */
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class MongoConnectionInfo {
        private boolean connected;
        private String databaseName;
        private Integer collectionCount;
        private String tenantId;
        private String errorMessage;
    }
}
