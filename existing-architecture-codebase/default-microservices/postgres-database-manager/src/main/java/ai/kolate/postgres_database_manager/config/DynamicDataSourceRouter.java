package ai.kolate.postgres_database_manager.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;

/**
 * Dynamic datasource router that switches datasource based on the current tenant context.
 * Extends Spring's AbstractRoutingDataSource to provide multi-tenant routing capabilities.
 */
@RequiredArgsConstructor
@Slf4j
public class DynamicDataSourceRouter extends AbstractRoutingDataSource {

    private final DatasourceContext datasourceContext;

    /**
     * Determines the current lookup key for datasource selection.
     * Uses the tenant ID from the DatasourceContext.
     *
     * @return The lookup key (tenant ID) for selecting the datasource
     */
    @Override
    protected String determineCurrentLookupKey() {
        String tenantId = datasourceContext.getTenantId();
        log.debug("Determining datasource for tenant: {}", tenantId);
        return tenantId;
    }
}
