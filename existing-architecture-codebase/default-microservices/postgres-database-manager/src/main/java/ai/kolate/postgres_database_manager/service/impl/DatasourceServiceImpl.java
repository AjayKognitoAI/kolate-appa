package ai.kolate.postgres_database_manager.service.impl;

import ai.kolate.postgres_database_manager.client.EnterpriseManagerClient;
import ai.kolate.postgres_database_manager.config.DatasourceMetadata;
import ai.kolate.postgres_database_manager.dto.EnterpriseDatasourceResponseDto;
import ai.kolate.postgres_database_manager.dto.GlobalResponse;
import ai.kolate.postgres_database_manager.service.DatasourceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zaxxer.hikari.HikariDataSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Implementation of the DatasourceService.
 * Manages a registry of datasources and interacts with the Enterprise Manager service.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DatasourceServiceImpl implements DatasourceService {

    private final EnterpriseManagerClient enterpriseManagerClient;
    private final ObjectMapper objectMapper;
    
    // In-memory cache of created datasources (in addition to Redis cache)
    private final Map<String, DataSource> dataSourceRegistry = new ConcurrentHashMap<>();

    /**
     * {@inheritDoc}
     */
    @Override
    public DataSource getDataSourceByOrganizationId(String organizationId) {
        log.info("Getting datasource for organization: {}", organizationId);
        
        // Check if datasource is already registered in local memory cache first
        DataSource dataSource = dataSourceRegistry.get(organizationId);
        if (dataSource != null) {
            log.debug("Found datasource in registry for organization: {}", organizationId);
            return dataSource;
        }
        
        // Try to get from Redis cache via metadata
        DatasourceMetadata metadata = getDatasourceMetadata(organizationId);
        if (metadata != null) {
            log.debug("Found datasource metadata in cache for organization: {}", organizationId);
            HikariDataSource hikariDataSource = metadata.toDataSource();
            dataSourceRegistry.put(organizationId, hikariDataSource);
            return hikariDataSource;
        }
        
        // Register a new datasource if not found in either cache
        return registerDataSource(organizationId);
    }

    /**
     * Get the datasource metadata from cache.
     * 
     * @param organizationId The organization ID
     * @return The datasource metadata, or null if not found
     */
    @Cacheable(value = "datasource-metadata", key = "#organizationId")
    public DatasourceMetadata getDatasourceMetadata(String organizationId) {
        // This will only be called if the metadata is not in the cache
        return null;
    }
    
    /**
     * Cache the datasource metadata.
     * 
     * @param organizationId The organization ID
     * @param metadata The datasource metadata
     */
    @CacheEvict(value = "datasource-metadata", key = "#organizationId")
    public void cacheDatasourceMetadata(String organizationId, DatasourceMetadata metadata) {
        log.debug("Caching datasource metadata for organization: {}", organizationId);
        // The annotation handles the caching/eviction
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public DataSource registerDataSource(String organizationId) {
        log.info("Registering new datasource for organization: {}", organizationId);
        
        try {
            // Fetch datasource details from Enterprise Manager
            log.info("Calling enterprise manager service for organization: {}", organizationId);
            GlobalResponse response = enterpriseManagerClient.getDatasourceByOrganizationId(organizationId, "postgres");
            
            log.info("Response from enterprise manager: {}", response);
            if (response == null || response.getData() == null) {
                log.warn("Failed to fetch datasource details for organization: {}. Falling back to default configuration.", organizationId);
                return createDefaultDatasource(organizationId);
            }
            
            // Convert the data object to EnterpriseDatasourceResponseDto
            log.info("Converting response data to EnterpriseDatasourceResponseDto. Response data: {}", response.getData());
            EnterpriseDatasourceResponseDto datasourceDetails = objectMapper.convertValue(
                    response.getData(), 
                    EnterpriseDatasourceResponseDto.class
            );
            log.info("Converted datasource details: {}", datasourceDetails);
            
            // Validate datasource details
            if (datasourceDetails == null) {
                log.warn("Unable to parse datasource details for organization: {}. Falling back to default configuration.", organizationId);
                return createDefaultDatasource(organizationId);
            }
            
            if (datasourceDetails.getDatasourceUrl() == null || datasourceDetails.getDatasourceUrl().isEmpty()) {
                log.error("Invalid datasource URL. Details: {}", datasourceDetails);
                log.warn("Invalid datasource URL for organization: {}. Falling back to default configuration.", organizationId);
                return createDefaultDatasource(organizationId);
            }
            
            if (datasourceDetails.getDatasourceUsername() == null || datasourceDetails.getDatasourceUsername().isEmpty()) {
                log.error("Missing datasource username. Details: {}", datasourceDetails);
                log.warn("Missing datasource username for organization: {}. Falling back to default configuration.", organizationId);
                return createDefaultDatasource(organizationId);
            }
            
            if (datasourceDetails.getDatasourcePassword() == null) {
                log.error("Missing datasource password. Details: {}", datasourceDetails);
                log.warn("Missing datasource password for organization: {}. Falling back to default configuration.", organizationId);
                return createDefaultDatasource(organizationId);
            }
            
            // Create and configure datasource
            HikariDataSource dataSource = new HikariDataSource();
            
            // Required: Set jdbcUrl first before setting driverClassName
            dataSource.setJdbcUrl(datasourceDetails.getDatasourceUrl());
            dataSource.setUsername(datasourceDetails.getDatasourceUsername());
            dataSource.setPassword(datasourceDetails.getDatasourcePassword());
            dataSource.setSchema(datasourceDetails.getDatasourceSchema());
            dataSource.setDriverClassName("org.postgresql.Driver");
            dataSource.setPoolName("HikariPool-" + organizationId);
            dataSource.setMaximumPoolSize(10);
            dataSource.setMinimumIdle(2);
            dataSource.setConnectionTimeout(30000); // 30 seconds
            
            // Register the datasource in local memory cache
            dataSourceRegistry.put(organizationId, dataSource);
            
            // Create and cache metadata for Redis
            DatasourceMetadata metadata = DatasourceMetadata.fromDataSource(dataSource);
            cacheDatasourceMetadata(organizationId, metadata);
            
            log.info("Datasource registered successfully for organization: {}", organizationId);
            return dataSource;
            
        } catch (Exception e) {
            log.error("Error registering datasource for organization: {}", organizationId, e);
            throw new RuntimeException("Failed to register datasource for organization: " + organizationId, e);
        }
    }
    
    /**
     * Creates a default datasource when the enterprise-manager service fails to provide details.
     * 
     * @param organizationId The organization ID
     * @return A default datasource
     */
    private DataSource createDefaultDatasource(String organizationId) {
        log.info("Creating default datasource for organization: {}", organizationId);
        
        // Create and configure datasource with default parameters
        HikariDataSource dataSource = new HikariDataSource();
        
        // These values should be configurable in application properties
        String defaultDbUrl = "jdbc:postgresql://localhost:5432/" + organizationId + "_users_db";
        dataSource.setJdbcUrl(defaultDbUrl);
        dataSource.setUsername("postgres");
        dataSource.setPassword("toor");
        dataSource.setDriverClassName("org.postgresql.Driver");
        dataSource.setPoolName("HikariPool-Default-" + organizationId);
        dataSource.setMaximumPoolSize(5);
        dataSource.setMinimumIdle(1);
        dataSource.setConnectionTimeout(30000); // 30 seconds
        
        // Register the datasource in local memory cache
        dataSourceRegistry.put(organizationId, dataSource);
        
        // Create and cache metadata for Redis
        DatasourceMetadata metadata = DatasourceMetadata.fromDataSource(dataSource);
        cacheDatasourceMetadata(organizationId, metadata);
        
        log.info("Default datasource created for organization: {}", organizationId);
        return dataSource;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @CacheEvict(value = "datasource-metadata", key = "#organizationId")
    public void removeDataSource(String organizationId) {
        log.info("Removing datasource for organization: {}", organizationId);
        
        DataSource dataSource = dataSourceRegistry.remove(organizationId);
        if (dataSource instanceof HikariDataSource) {
            ((HikariDataSource) dataSource).close();
            log.info("Datasource closed and removed for organization: {}", organizationId);
        }
    }
}
