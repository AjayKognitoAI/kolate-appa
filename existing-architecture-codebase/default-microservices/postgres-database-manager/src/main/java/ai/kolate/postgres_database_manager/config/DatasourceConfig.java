package ai.kolate.postgres_database_manager.config;

import ai.kolate.postgres_database_manager.service.DatasourceService;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

/**
 * Configuration for dynamic datasource routing.
 * Sets up the default datasource and the dynamic datasource router.
 */
@Configuration
@EnableJpaRepositories(basePackages = "ai.kolate.user_manager.repository")
@RequiredArgsConstructor
@Slf4j
public class DatasourceConfig {

    private final DatasourceContext datasourceContext;
    private final DatasourceService datasourceService;
    
    /**
     * Default datasource properties from application.yml-bkp.
     * Used for initial setup and as fallback.
     */
    @Bean
    @Primary
    @ConfigurationProperties(prefix = "spring.datasource")
    public DataSourceProperties dataSourceProperties() {
        return new DataSourceProperties();
    }

    /**
     * Default datasource for "default" tenant.
     * Used when no specific tenant is specified.
     */
    @Bean
    public DataSource defaultDataSource(DataSourceProperties properties) {
        log.info("Initializing default datasource");
        HikariDataSource dataSource = properties.initializeDataSourceBuilder()
                .type(HikariDataSource.class)
                .build();
        dataSource.setPoolName("HikariPool-Default");
        return dataSource;
    }

    /**
     * The primary datasource that routes to the appropriate tenant datasource.
     * Uses AbstractRoutingDataSource to switch datasources based on tenant context.
     */
    @Bean
    @Primary
    public DataSource dataSource(DataSource defaultDataSource) {
        log.info("Initializing dynamic datasource router");
        
        // Initialize with the default datasource
        Map<Object, Object> targetDataSources = new HashMap<>();
        targetDataSources.put("default", defaultDataSource);
        
        // Create the dynamic datasource router
        DynamicDataSourceRouter dynamicDataSourceRouter = new DynamicDataSourceRouter(datasourceContext);
        dynamicDataSourceRouter.setDefaultTargetDataSource(defaultDataSource);
        dynamicDataSourceRouter.setTargetDataSources(targetDataSources);
        dynamicDataSourceRouter.afterPropertiesSet();
        
        // Expose the router directly without wrapping
        return dynamicDataSourceRouter;
    }
    
    /**
     * We no longer need to use reflection to access the router since we're
     * not wrapping it with LazyConnectionDataSourceProxy anymore.
     */
    
    /**
     * Cleanup datasources on application shutdown.
     */
    @PreDestroy
    public void cleanup() {
        log.info("Cleaning up datasources on shutdown");
        // Cleanup could be implemented if needed
    }
}
