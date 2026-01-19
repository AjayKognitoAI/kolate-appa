package ai.kolate.postgres_database_manager.config;

import ai.kolate.postgres_database_manager.service.DatasourceService;
import ai.kolate.postgres_database_manager.service.FlywaySchemaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;

import javax.sql.DataSource;
import java.lang.reflect.Field;
import java.util.Map;

/**
 * Resolves datasources at runtime based on tenant context.
 * Dynamically adds new datasources to the routing datasource as they are requested.
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class DatasourceResolver {

    private final DatasourceService datasourceService;
    private final DataSource dataSource;
    private final FlywaySchemaService flywaySchemaService;
    
    /**
     * Resolve or create a datasource for the given organization ID.
     * If the datasource already exists, it is returned directly.
     * If not, a new datasource is created, registered, and returned.
     *
     * @param organizationId The organization ID
     * @return The resolved datasource
     */
    public DataSource resolveDatasource(String organizationId) {
        log.debug("Resolving datasource for organization: {}", organizationId);
        
        try {
            // Unwrap to get the actual routing datasource
            AbstractRoutingDataSource routingDataSource = getRoutingDataSource();
            
            // Get access to the target datasources map via reflection
            Field targetDataSourcesField = AbstractRoutingDataSource.class.getDeclaredField("targetDataSources");
            targetDataSourcesField.setAccessible(true);
            
            @SuppressWarnings("unchecked")
            Map<Object, Object> targetDataSources = (Map<Object, Object>) targetDataSourcesField.get(routingDataSource);
            
            // Check if we already have this datasource
            if (targetDataSources.containsKey(organizationId)) {
                log.debug("Found existing datasource for organization: {}", organizationId);
                return (DataSource) targetDataSources.get(organizationId);
            }
            
            // Get or create the datasource
            DataSource orgDataSource = datasourceService.getDataSourceByOrganizationId(organizationId);
            
            // Ensure schema is up to date using Flyway migrations
            flywaySchemaService.ensureSchemaUpToDate(orgDataSource, organizationId);
            
            // Add the new datasource to the routing datasource
            targetDataSources.put(organizationId, orgDataSource);
            routingDataSource.afterPropertiesSet();
            
            log.info("Added new datasource for organization: {}", organizationId);
            return orgDataSource;
            
        } catch (Exception e) {
            log.error("Error resolving datasource for organization: {}", organizationId, e);
            throw new RuntimeException("Failed to resolve datasource for organization: " + organizationId, e);
        }
    }
    
    /**
     * Get the routing datasource from the wrapped datasource.
     *
     * @return The AbstractRoutingDataSource instance
     * @throws Exception If the datasource cannot be unwrapped
     */
    private AbstractRoutingDataSource getRoutingDataSource() throws Exception {
        // Since we've removed the LazyConnectionDataSourceProxy wrapper in the configuration,
        // we should be able to cast directly to AbstractRoutingDataSource
        if (dataSource instanceof AbstractRoutingDataSource) {
            return (AbstractRoutingDataSource) dataSource;
        }
        
        throw new IllegalStateException("Expected dataSource to be an instance of AbstractRoutingDataSource, but got: " 
                + dataSource.getClass().getName());
    }
}
