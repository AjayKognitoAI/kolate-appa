package ai.kolate.mongo_database_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnterpriseMongoDatasourceResponseDto {
    private UUID id;
    private String organizationId;
    
    // Main datasource URL field (contains full MongoDB connection string)
    private String datasourceUrl;
    private String datasourceUsername; 
    private String datasourcePassword;
    private String datasourceSchema;    // Database name (mapped from datasourceSchema)
    
    // Additional MongoDB Connection Components
    private String connectionString;    // Alternative full connection string
    private String databaseName;        // MongoDB database name
    private String authDatabase;        // Authentication database (usually "admin")
    
    // Connection Pool Settings
    private Integer maxPoolSize;
    private Integer minPoolSize;
    private Integer connectionTimeoutMs;
    private Integer socketTimeoutMs;
    
    // Additional MongoDB Settings
    private String replicaSet;
    private Boolean sslEnabled;
    private String applicationName;
    
    /**
     * Extract database name from datasourceSchema field (for compatibility with Enterprise Manager response)
     */
    public String getDatabaseName() {
        if (databaseName != null && !databaseName.isEmpty()) {
            return databaseName;
        }
        // Fall back to datasourceSchema if databaseName is not set
        return datasourceSchema;
    }
    
    /**
     * Get the connection string - either from datasourceUrl or connectionString field
     */
    public String getConnectionString() {
        if (connectionString != null && !connectionString.isEmpty()) {
            return connectionString;
        }
        // Fall back to datasourceUrl if connectionString is not set
        return datasourceUrl;
    }
}
