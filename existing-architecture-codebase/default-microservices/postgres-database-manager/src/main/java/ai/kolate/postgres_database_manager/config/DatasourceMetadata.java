package ai.kolate.postgres_database_manager.config;

import com.zaxxer.hikari.HikariDataSource;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * Serializable metadata class for HikariDataSource.
 * Used as a surrogate for caching datasource properties.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasourceMetadata implements Serializable {
    private String jdbcUrl;
    private String username;
    private String password;
    private String driverClassName;
    private String poolName;
    private int maximumPoolSize;
    private int minimumIdle;
    private long connectionTimeout;
    
    /**
     * Create metadata from a HikariDataSource.
     *
     * @param dataSource The source HikariDataSource
     * @return The created metadata
     */
    public static DatasourceMetadata fromDataSource(HikariDataSource dataSource) {
        return new DatasourceMetadata(
                dataSource.getJdbcUrl(),
                dataSource.getUsername(),
                dataSource.getPassword(),
                dataSource.getDriverClassName(),
                dataSource.getPoolName(),
                dataSource.getMaximumPoolSize(),
                dataSource.getMinimumIdle(),
                dataSource.getConnectionTimeout()
        );
    }
    
    /**
     * Create a HikariDataSource from this metadata.
     *
     * @return The created HikariDataSource
     */
    public HikariDataSource toDataSource() {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl(jdbcUrl);
        dataSource.setUsername(username);
        dataSource.setPassword(password);
        dataSource.setDriverClassName(driverClassName);
        dataSource.setPoolName(poolName);
        dataSource.setMaximumPoolSize(maximumPoolSize);
        dataSource.setMinimumIdle(minimumIdle);
        dataSource.setConnectionTimeout(connectionTimeout);
        return dataSource;
    }
}
