package ai.kolate.mongo_database_manager.service;

import ai.kolate.mongo_database_manager.config.MongoDatasourceMetadata;
import org.springframework.data.mongodb.core.MongoTemplate;
import com.mongodb.client.MongoDatabase;


/**
 * Service interface for dynamic MongoDB datasource management.
 */
public interface MongoDatasourceService {

    /**
     * Get or create a MongoTemplate for the specified organization.
     *
     * @param organizationId The organization ID
     * @return The configured MongoTemplate
     */
    MongoTemplate getMongoTemplateByOrganizationId(String organizationId);

    /**
     * Get or create a MongoDatabase for the specified organization.
     *
     * @param organizationId The organization ID
     * @return The configured MongoDatabase
     */
    MongoDatabase getMongoDatabaseByOrganizationId(String organizationId);

    /**
     * Get MongoDB datasource metadata from cache.
     *
     * @param organizationId The organization ID
     * @return The MongoDB datasource metadata
     */
    MongoDatasourceMetadata getMongoDatasourceMetadata(String organizationId);

    /**
     * Register a new MongoDB datasource for an organization.
     *
     * @param organizationId The organization ID
     * @return The new MongoTemplate
     */
    MongoTemplate registerMongoDatasource(String organizationId);

    /**
     * Remove a MongoDB datasource from the registry.
     *
     * @param organizationId The organization ID
     */
    void removeMongoDatasource(String organizationId);

}
