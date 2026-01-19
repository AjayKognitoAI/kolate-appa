package ai.kolate.mongo_database_manager.config;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.mongodb.config.AbstractMongoClientConfiguration;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

import java.util.concurrent.TimeUnit;

/**
 * Configuration for MongoDB multi-tenant setup.
 * Sets up the default MongoDB connection and enables repository scanning.
 */
@Configuration
@EnableMongoRepositories(basePackages = "ai.kolate.mongo_database_manager.repository")
@RequiredArgsConstructor
@Slf4j
public class MongoConfig extends AbstractMongoClientConfiguration {

    @Value("${spring.data.mongodb.uri:mongodb://localhost:27017}")
    private String defaultConnectionString;

    @Value("${spring.data.mongodb.database:default_db}")
    private String defaultDatabaseName;

    @Value("${spring.data.mongodb.connection-pool.max-size:20}")
    private Integer maxPoolSize;

    @Value("${spring.data.mongodb.connection-pool.min-size:5}")
    private Integer minPoolSize;

    @Value("${spring.data.mongodb.connection-timeout:10000}")
    private Integer connectionTimeoutMs;

    /**
     * Default database name for the default tenant.
     */
    @Override
    protected String getDatabaseName() {
        return defaultDatabaseName;
    }

    /**
     * Default MongoDB client configuration.
     * Used for the "default" tenant and as a base configuration.
     */
    @Override
    @Bean
    @Primary
    public MongoClient mongoClient() {
        log.info("Initializing default MongoDB client");

        MongoClientSettings settings = MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(defaultConnectionString))
                .applyToConnectionPoolSettings(builder -> {
                    builder.maxSize(maxPoolSize);
                    builder.minSize(minPoolSize);
                    builder.maxConnectionIdleTime(30, TimeUnit.SECONDS);
                    builder.maxConnectionLifeTime(60, TimeUnit.SECONDS);
                })
                .applyToSocketSettings(builder -> {
                    builder.connectTimeout(connectionTimeoutMs, TimeUnit.MILLISECONDS);
                    builder.readTimeout(30000, TimeUnit.MILLISECONDS);
                })
                .build();

        return MongoClients.create(settings);
    }

    /**
     * Default MongoTemplate for the "default" tenant.
     * This will be used when no specific tenant is specified.
     */
    @Bean
    @Primary
    public MongoTemplate mongoTemplate() {
        log.info("Initializing default MongoTemplate");
        return new MongoTemplate(mongoClient(), getDatabaseName());
    }

    /**
     * MongoDB tenant-aware template factory.
     * This bean can be used to create MongoTemplate instances for specific tenants.
     */
    @Bean
    public MongoTenantTemplateFactory mongoTenantTemplateFactory(
            MongoDatasourceResolver mongoDatasourceResolver,
            MongoTenantContext mongoTenantContext) {
        return new MongoTenantTemplateFactory(mongoDatasourceResolver, mongoTenantContext);
    }

    /**
     * Cleanup MongoDB connections on application shutdown.
     */
    @PreDestroy
    public void cleanup() {
        log.info("Cleaning up MongoDB connections on shutdown");
        // Additional cleanup can be implemented if needed
    }
}
