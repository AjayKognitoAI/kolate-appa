package ai.kolate.postgres_database_manager.controller;

import ai.kolate.postgres_database_manager.service.DatasourceService;
import ai.kolate.postgres_database_manager.service.FlywaySchemaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.api.MigrationInfo;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller for managing database migrations in development/admin environments.
 * DO NOT expose this in production without proper security controls.
 */
@RestController
@RequestMapping("/internal/postgres-database-manager")
@RequiredArgsConstructor
@Slf4j
public class MigrationController {

    private final FlywaySchemaService flywaySchemaService;
    private final DatasourceService datasourceService;

    /**
     * Get migration status for a specific organization.
     */
    @GetMapping("/v1/migration/{organizationId}/status")
    public ResponseEntity<Map<String, Object>> getMigrationStatus(@PathVariable String organizationId) {
        try {
            DataSource dataSource = datasourceService.getDataSourceByOrganizationId(organizationId);
            MigrationInfo[] migrations = flywaySchemaService.getMigrationInfo(dataSource, organizationId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("organizationId", organizationId);
            response.put("totalMigrations", migrations.length);
            response.put("migrations", Arrays.stream(migrations)
                    .map(this::migrationInfoToMap)
                    .toList());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting migration status for organization: {}", organizationId, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to get migration status: " + e.getMessage()));
        }
    }

    /**
     * Force migration for a specific organization.
     */
    @PostMapping("/v1/migration/{organizationId}/migrate")
    public ResponseEntity<Map<String, Object>> forceMigration(@PathVariable String organizationId) {
        try {
            DataSource dataSource = datasourceService.getDataSourceByOrganizationId(organizationId);
            flywaySchemaService.ensureSchemaUpToDate(dataSource, organizationId);
            
            return ResponseEntity.ok(Map.of(
                    "organizationId", organizationId,
                    "status", "Migration completed successfully"
            ));
        } catch (Exception e) {
            log.error("Error forcing migration for organization: {}", organizationId, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Migration failed: " + e.getMessage()));
        }
    }

    /**
     * Repair migration history for a specific organization.
     */
    @PostMapping("/v1/migration/{organizationId}/repair")
    public ResponseEntity<Map<String, Object>> repairMigration(@PathVariable String organizationId) {
        try {
            DataSource dataSource = datasourceService.getDataSourceByOrganizationId(organizationId);
            flywaySchemaService.repairSchema(dataSource, organizationId);
            
            return ResponseEntity.ok(Map.of(
                    "organizationId", organizationId,
                    "status", "Migration history repaired successfully"
            ));
        } catch (Exception e) {
            log.error("Error repairing migration for organization: {}", organizationId, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Repair failed: " + e.getMessage()));
        }
    }

    /**
     * Clear migration cache.
     */
    @PostMapping("/v1/migration/cache/clear")
    public ResponseEntity<Map<String, Object>> clearCache() {
        try {
            flywaySchemaService.clearMigrationCache();
            return ResponseEntity.ok(Map.of("status", "Migration cache cleared successfully"));
        } catch (Exception e) {
            log.error("Error clearing migration cache", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to clear cache: " + e.getMessage()));
        }
    }

    /**
     * Convert MigrationInfo to a map for JSON response.
     */
    private Map<String, Object> migrationInfoToMap(MigrationInfo info) {
        Map<String, Object> map = new HashMap<>();
        map.put("version", info.getVersion() != null ? info.getVersion().toString() : null);
        map.put("description", info.getDescription());
        map.put("type", info.getType().toString());
        map.put("state", info.getState().toString());
        map.put("installedOn", info.getInstalledOn());
        map.put("executionTime", info.getExecutionTime());
        return map;
    }
}
