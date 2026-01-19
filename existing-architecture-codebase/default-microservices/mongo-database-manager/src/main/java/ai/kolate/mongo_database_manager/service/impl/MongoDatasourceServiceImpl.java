package ai.kolate.mongo_database_manager.service.impl;

import ai.kolate.mongo_database_manager.client.EnterpriseManagerClient;
import ai.kolate.mongo_database_manager.config.MongoDatasourceMetadata;
import ai.kolate.mongo_database_manager.dto.EnterpriseMongoDatasourceResponseDto;
import ai.kolate.mongo_database_manager.dto.GlobalResponse;
import ai.kolate.mongo_database_manager.service.MongoDatasourceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Implementation of the MongoDatasourceService.
 * Manages a registry of MongoDB datasources and interacts with the Enterprise Manager service.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MongoDatasourceServiceImpl implements MongoDatasourceService {

    private final EnterpriseManagerClient enterpriseManagerClient;
    private final ObjectMapper objectMapper;

    // In-memory cache of created MongoDB clients and templates
    private final Map<String, MongoClient> mongoClientRegistry = new ConcurrentHashMap<>();
    private final Map<String, MongoTemplate> mongoTemplateRegistry = new ConcurrentHashMap<>();
    private final Map<String, MongoDatabase> mongoDatabaseRegistry = new ConcurrentHashMap<>();

    /**
     * {@inheritDoc}
     */
    @Override
    public MongoTemplate getMongoTemplateByOrganizationId(String organizationId) {
        log.info("Getting MongoDB template for organization: {}", organizationId);

        // Check if template is already registered in local memory cache first
        MongoTemplate mongoTemplate = mongoTemplateRegistry.get(organizationId);
        if (mongoTemplate != null) {
            log.debug("Found MongoDB template in registry for organization: {}", organizationId);
            return mongoTemplate;
        }

        // Try to get from Redis cache via metadata
        MongoDatasourceMetadata metadata = getMongoDatasourceMetadata(organizationId);
        if (metadata != null) {
            log.debug("Found MongoDB datasource metadata in cache for organization: {}", organizationId);
            MongoTemplate template = metadata.toMongoTemplate();
            MongoClient client = metadata.toMongoClient();

            mongoClientRegistry.put(organizationId, client);
            mongoTemplateRegistry.put(organizationId, template);
            mongoDatabaseRegistry.put(organizationId, client.getDatabase(metadata.getDatabaseName()));
            return template;
        }

        // Register a new datasource if not found in either cache
        return registerMongoDatasource(organizationId);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public MongoDatabase getMongoDatabaseByOrganizationId(String organizationId) {
        log.info("Getting MongoDB database for organization: {}", organizationId);

        // Check if database is already registered
        MongoDatabase database = mongoDatabaseRegistry.get(organizationId);
        if (database != null) {
            log.debug("Found MongoDB database in registry for organization: {}", organizationId);
            return database;
        }

        // Get template first, which will populate the database registry
        MongoTemplate template = getMongoTemplateByOrganizationId(organizationId);
        return mongoDatabaseRegistry.get(organizationId);
    }

    /**
     * Get the MongoDB datasource metadata from cache.
     *
     * @param organizationId The organization ID
     * @return The MongoDB datasource metadata, or null if not found
     */
    @Override
    @Cacheable(value = "mongo-datasource-metadata", key = "#organizationId")
    public MongoDatasourceMetadata getMongoDatasourceMetadata(String organizationId) {
        // This will only be called if the metadata is not in the cache
        log.debug("Metadata not found in cache for organization: {}", organizationId);
        return null;
    }

    /**
     * Cache the MongoDB datasource metadata.
     *
     * @param organizationId The organization ID
     * @param metadata The MongoDB datasource metadata
     */
    @CachePut(value = "mongo-datasource-metadata", key = "#organizationId")
    public MongoDatasourceMetadata cacheMongoDatasourceMetadata(String organizationId, MongoDatasourceMetadata metadata) {
        log.debug("Caching MongoDB datasource metadata for organization: {}", organizationId);
        return metadata;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public MongoTemplate registerMongoDatasource(String organizationId) {
        log.info("Registering new MongoDB datasource for organization: {}", organizationId);

        try {
            // Fetch MongoDB datasource details from Enterprise Manager
            log.info("Calling enterprise manager service for MongoDB configuration for organization: {}", organizationId);
            GlobalResponse response = enterpriseManagerClient.getDatasourceByOrganizationId(organizationId, "mongo");

            log.info("Response from enterprise manager for MongoDB: {}", response);
            if (response == null || response.getData() == null) {
                log.warn("Failed to fetch MongoDB datasource details for organization: {}. Falling back to default configuration.", organizationId);
                return createDefaultMongoDatasource(organizationId);
            }

            // Convert the data object to EnterpriseMongoDatasourceResponseDto
            log.info("Converting response data to EnterpriseMongoDatasourceResponseDto. Response data: {}", response.getData());
            EnterpriseMongoDatasourceResponseDto datasourceDetails = objectMapper.convertValue(
                    response.getData(),
                    EnterpriseMongoDatasourceResponseDto.class
            );
            log.info("Converted MongoDB datasource details: {}", datasourceDetails);

            // Validate datasource details
            if (datasourceDetails == null) {
                log.warn("Unable to parse MongoDB datasource details for organization: {}. Falling back to default configuration.", organizationId);
                return createDefaultMongoDatasource(organizationId);
            }

            return createMongoTemplateFromDatasource(organizationId, datasourceDetails);

        } catch (Exception e) {
            log.error("Error registering MongoDB datasource for organization: {}", organizationId, e);
            log.warn("Falling back to default configuration due to error");
            return createDefaultMongoDatasource(organizationId);
        }
    }

    /**
     * Create MongoTemplate from datasource details.
     */
    private MongoTemplate createMongoTemplateFromDatasource(String organizationId, EnterpriseMongoDatasourceResponseDto datasourceDetails) {
        String connectionString = null;
        String databaseName = null;

        // Try to get connection string - either full string or from URL field
        if (datasourceDetails.getConnectionString() != null && !datasourceDetails.getConnectionString().isEmpty()) {
            connectionString = datasourceDetails.getConnectionString();
            databaseName = extractDatabaseNameFromConnectionString(connectionString);
        } else if (datasourceDetails.getDatasourceUrl() != null && !datasourceDetails.getDatasourceUrl().isEmpty()) {
            connectionString = datasourceDetails.getDatasourceUrl();
            databaseName = extractDatabaseNameFromConnectionString(connectionString);
        }

        // If we don't have a full connection string, build it from components
        if (connectionString == null || connectionString.isEmpty()) {
            log.warn("No connection string found in datasource details for organization: {}. Falling back to default configuration.", organizationId);
            return createDefaultMongoDatasource(organizationId);
        }

        // Use database name from datasourceDetails if available, otherwise extracted from connection string
        if (datasourceDetails.getDatabaseName() != null && !datasourceDetails.getDatabaseName().isEmpty()) {
            databaseName = datasourceDetails.getDatabaseName();
        }

        if (databaseName == null || databaseName.isEmpty()) {
            log.error("Could not determine database name for organization: {}. Details: {}", organizationId, datasourceDetails);
            return createDefaultMongoDatasource(organizationId);
        }

        // Create MongoDB client settings
        MongoClientSettings.Builder settingsBuilder = MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(connectionString))
                .applyToConnectionPoolSettings(builder -> {
                    builder.maxSize(datasourceDetails.getMaxPoolSize() != null ? datasourceDetails.getMaxPoolSize() : 20);
                    builder.minSize(datasourceDetails.getMinPoolSize() != null ? datasourceDetails.getMinPoolSize() : 5);
                    builder.maxConnectionIdleTime(30, TimeUnit.SECONDS);
                    builder.maxConnectionLifeTime(60, TimeUnit.SECONDS);
                })
                .applyToSocketSettings(builder -> {
                    builder.connectTimeout(datasourceDetails.getConnectionTimeoutMs() != null ?
                            datasourceDetails.getConnectionTimeoutMs() : 10000, TimeUnit.MILLISECONDS);
                    builder.readTimeout(datasourceDetails.getSocketTimeoutMs() != null ?
                            datasourceDetails.getSocketTimeoutMs() : 30000, TimeUnit.MILLISECONDS);
                });

        MongoClientSettings settings = settingsBuilder.build();

        MongoClient mongoClient = MongoClients.create(settings);
        MongoDatabase database = mongoClient.getDatabase(databaseName);
        MongoTemplate mongoTemplate = new MongoTemplate(mongoClient, databaseName);

        // Register in local memory caches
        mongoClientRegistry.put(organizationId, mongoClient);
        mongoTemplateRegistry.put(organizationId, mongoTemplate);
        mongoDatabaseRegistry.put(organizationId, database);

        // Create and cache metadata for Redis
        MongoDatasourceMetadata metadata = MongoDatasourceMetadata.fromMongoDatasource(
                connectionString,
                databaseName,
                datasourceDetails.getAuthDatabase() != null ? datasourceDetails.getAuthDatabase() : "admin",
                datasourceDetails.getMaxPoolSize(),
                datasourceDetails.getMinPoolSize(),
                datasourceDetails.getConnectionTimeoutMs()
        );
        cacheMongoDatasourceMetadata(organizationId, metadata);

        log.info("MongoDB datasource registered successfully for organization: {} with database: {}", organizationId, databaseName);
        return mongoTemplate;
    }

    /**
     * Extract database name from MongoDB connection string.
     */
    private String extractDatabaseNameFromConnectionString(String connectionString) {
        try {
            ConnectionString connStr = new ConnectionString(connectionString);
            String database = connStr.getDatabase();
            log.debug("Extracted database name from connection string: {}", database);
            return database;
        } catch (Exception e) {
            log.warn("Could not extract database name from connection string: {}", connectionString, e);
            return null;
        }
    }

    /**
     * Creates a default MongoDB datasource when the enterprise-manager service fails to provide details.
     *
     * @param organizationId The organization ID
     * @return A default MongoTemplate
     */
    private MongoTemplate createDefaultMongoDatasource(String organizationId) {
        log.info("Creating default MongoDB datasource for organization: {}", organizationId);

        try {
            // These values should be configurable in application properties
            String defaultConnectionString = "mongodb://localhost:27017";
            String defaultDatabaseName = organizationId + "_db";

            MongoClientSettings settings = MongoClientSettings.builder()
                    .applyConnectionString(new ConnectionString(defaultConnectionString))
                    .applyToConnectionPoolSettings(builder -> {
                        builder.maxSize(10);
                        builder.minSize(2);
                        builder.maxConnectionIdleTime(30, TimeUnit.SECONDS);
                        builder.maxConnectionLifeTime(60, TimeUnit.SECONDS);
                    })
                    .applyToSocketSettings(builder -> {
                        builder.connectTimeout(10000, TimeUnit.MILLISECONDS);
                        builder.readTimeout(30000, TimeUnit.MILLISECONDS);
                    })
                    .build();

            MongoClient mongoClient = MongoClients.create(settings);
            MongoDatabase database = mongoClient.getDatabase(defaultDatabaseName);
            MongoTemplate mongoTemplate = new MongoTemplate(mongoClient, defaultDatabaseName);

            // Register in local memory caches
            mongoClientRegistry.put(organizationId, mongoClient);
            mongoTemplateRegistry.put(organizationId, mongoTemplate);
            mongoDatabaseRegistry.put(organizationId, database);

            // Create and cache metadata for Redis
            MongoDatasourceMetadata metadata = MongoDatasourceMetadata.fromMongoDatasource(
                    defaultConnectionString,
                    defaultDatabaseName,
                    "admin", // default auth source
                    10,
                    2,
                    10000
            );
            cacheMongoDatasourceMetadata(organizationId, metadata);

            log.info("Default MongoDB datasource created for organization: {}", organizationId);
            return mongoTemplate;

        } catch (Exception e) {
            log.error("Error creating default MongoDB datasource for organization: {}", organizationId, e);
            throw new RuntimeException("Failed to create default MongoDB datasource for organization: " + organizationId, e);
        }
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @CacheEvict(value = "mongo-datasource-metadata", key = "#organizationId")
    public void removeMongoDatasource(String organizationId) {
        log.info("Removing MongoDB datasource for organization: {}", organizationId);

        // Remove from registries
        mongoTemplateRegistry.remove(organizationId);
        mongoDatabaseRegistry.remove(organizationId);

        MongoClient mongoClient = mongoClientRegistry.remove(organizationId);
        if (mongoClient != null) {
            mongoClient.close();
            log.info("MongoDB client closed and removed for organization: {}", organizationId);
        }
    }
}