package ai.kolate.postgres_database_manager.service;

import ai.kolate.postgres_database_manager.config.DatasourceMetadata;

import javax.sql.DataSource;

/**
 * Service interface for dynamic datasource management.
 */
public interface DatasourceService {

    /**
     * Get or create a datasource for the specified organization.
     *
     * @param organizationId The organization ID
     * @return The configured datasource
     */
    DataSource getDataSourceByOrganizationId(String organizationId);

    /**
     * Get datasource metadata from cache.
     *
     * @param organizationId The organization ID
     * @return The datasource metadata
     */
    DatasourceMetadata getDatasourceMetadata(String organizationId);

    /**
     * Register a new datasource for an organization.
     *
     * @param organizationId The organization ID
     * @return The new datasource
     */
    DataSource registerDataSource(String organizationId);
    
    /**
     * Remove a datasource from the registry.
     *
     * @param organizationId The organization ID
     */
    void removeDataSource(String organizationId);
}
