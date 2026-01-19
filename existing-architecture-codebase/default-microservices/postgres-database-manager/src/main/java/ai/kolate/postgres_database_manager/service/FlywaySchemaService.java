package ai.kolate.postgres_database_manager.service;

import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.flywaydb.core.api.output.MigrateResult;
import org.flywaydb.core.api.MigrationInfoService;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Schema service using Flyway for database migrations.
 * Provides robust schema management with versioning for multi-tenant databases.
 */
@Service
@Slf4j
public class FlywaySchemaService {

    // Cache to track which organizations have been migrated to avoid repeated checks
    private final ConcurrentMap<String, Boolean> migratedOrganizations = new ConcurrentHashMap<>();

    /**
     * Initialize or migrate schema using Flyway for a tenant database.
     *
     * @param dataSource The tenant's datasource
     * @param organizationId The organization/tenant ID
     */
    public void ensureSchemaUpToDate(DataSource dataSource, String organizationId) {
        // Check if already migrated in this session
        if (migratedOrganizations.containsKey(organizationId)) {
            log.debug("Schema already checked for organization: {}", organizationId);
            return;
        }

        log.info("Ensuring schema is up to date for organization: {}", organizationId);
        
        try {
            Flyway flyway = createFlywayInstance(dataSource, organizationId);
            
            // Check current migration status
            MigrationInfoService info = flyway.info();
            MigrationInfo[] migrations = info.all();
            
            log.debug("Found {} migrations for organization: {}", migrations.length, organizationId);
            
            // Run migrations
            MigrateResult migrateResult = flyway.migrate();
            int migrationsExecuted = migrateResult.migrationsExecuted;
            
            if (migrationsExecuted > 0) {
                log.info("Successfully executed {} migrations for organization: {}", 
                        migrationsExecuted, organizationId);
            } else {
                log.debug("No new migrations needed for organization: {}", organizationId);
            }
            
            // Mark as migrated
            migratedOrganizations.put(organizationId, true);
            
        } catch (Exception e) {
            log.error("Flyway migration failed for organization: {}", organizationId, e);
            throw new RuntimeException("Schema migration failed for organization: " + organizationId, e);
        }
    }

    /**
     * Get migration information for a tenant database.
     *
     * @param dataSource The tenant's datasource
     * @param organizationId The organization/tenant ID
     * @return Array of migration information
     */
    public MigrationInfo[] getMigrationInfo(DataSource dataSource, String organizationId) {
        log.debug("Getting migration info for organization: {}", organizationId);
        
        try {
            Flyway flyway = createFlywayInstance(dataSource, organizationId);
            return flyway.info().all();
        } catch (Exception e) {
            log.error("Failed to get migration info for organization: {}", organizationId, e);
            throw new RuntimeException("Failed to get migration info for organization: " + organizationId, e);
        }
    }

    /**
     * Repair the Flyway schema history table for a tenant database.
     * Use this if migration checksums have changed or there are issues with the schema history.
     *
     * @param dataSource The tenant's datasource
     * @param organizationId The organization/tenant ID
     */
    public void repairSchema(DataSource dataSource, String organizationId) {
        log.warn("Repairing Flyway schema history for organization: {}", organizationId);
        
        try {
            Flyway flyway = createFlywayInstance(dataSource, organizationId);
            flyway.repair();
            
            // Remove from cache so it gets re-checked
            migratedOrganizations.remove(organizationId);
            
            log.info("Successfully repaired schema history for organization: {}", organizationId);
        } catch (Exception e) {
            log.error("Failed to repair schema for organization: {}", organizationId, e);
            throw new RuntimeException("Schema repair failed for organization: " + organizationId, e);
        }
    }

    /**
     * Clean the database schema (removes all objects).
     * WARNING: This will delete all data! Use only in development/testing.
     *
     * @param dataSource The tenant's datasource
     * @param organizationId The organization/tenant ID
     */
    public void cleanSchema(DataSource dataSource, String organizationId) {
        log.warn("CLEANING database schema for organization: {} - ALL DATA WILL BE LOST!", organizationId);
        
        try {
            Flyway flyway = createFlywayInstance(dataSource, organizationId);
            flyway.clean();
            
            // Remove from cache
            migratedOrganizations.remove(organizationId);
            
            log.warn("Successfully cleaned schema for organization: {}", organizationId);
        } catch (Exception e) {
            log.error("Failed to clean schema for organization: {}", organizationId, e);
            throw new RuntimeException("Schema clean failed for organization: " + organizationId, e);
        }
    }

    /**
     * Create a configured Flyway instance for the given datasource.
     *
     * @param dataSource The datasource to configure Flyway for
     * @param organizationId The organization ID for logging purposes
     * @return Configured Flyway instance
     */
    private Flyway createFlywayInstance(DataSource dataSource, String organizationId) {
        return Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .baselineDescription("Initial baseline for organization: " + organizationId)
                .validateOnMigrate(true)
                .outOfOrder(false)
                .table("flyway_schema_history")
                .load();
    }

    /**
     * Clear the migration cache. Useful for testing or when you want to force re-checking.
     */
    public void clearMigrationCache() {
        log.info("Clearing Flyway migration cache");
        migratedOrganizations.clear();
    }

    /**
     * Check if an organization has been migrated in this session.
     *
     * @param organizationId The organization ID
     * @return true if migrated, false otherwise
     */
    public boolean isMigrated(String organizationId) {
        return migratedOrganizations.containsKey(organizationId);
    }
}
