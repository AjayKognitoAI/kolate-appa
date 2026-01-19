package ai.kolate.mongo_database_manager.config;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;

import java.io.Serializable;
import java.util.concurrent.TimeUnit;

/**
 * Serializable metadata class for MongoDB datasource.
 * Used as a surrogate for caching MongoDB connection properties.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MongoDatasourceMetadata implements Serializable {
    private String connectionString;
    private String databaseName;
    private String authSource;
    private Integer maxPoolSize;
    private Integer minPoolSize;
    private Integer connectionTimeoutMs;

    /**
     * Create metadata from MongoDB datasource configuration.
     *
     * @param connectionString The MongoDB connection string
     * @param databaseName The database name
     * @param authSource The authentication source database
     * @param maxPoolSize Maximum pool size
     * @param minPoolSize Minimum pool size
     * @param connectionTimeoutMs Connection timeout in milliseconds
     * @return The created metadata
     */
    public static MongoDatasourceMetadata fromMongoDatasource(
            String connectionString,
            String databaseName,
            String authSource,
            Integer maxPoolSize,
            Integer minPoolSize,
            Integer connectionTimeoutMs) {
        return new MongoDatasourceMetadata(
                connectionString,
                databaseName,
                authSource,
                maxPoolSize,
                minPoolSize,
                connectionTimeoutMs
        );
    }

    /**
     * Create a MongoTemplate from this metadata.
     *
     * @return The created MongoTemplate
     */
    public MongoTemplate toMongoTemplate() {
        MongoClientSettings settings = MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(connectionString))
                .applyToConnectionPoolSettings(builder -> {
                    builder.maxSize(maxPoolSize != null ? maxPoolSize : 20);
                    builder.minSize(minPoolSize != null ? minPoolSize : 5);
                    builder.maxConnectionIdleTime(30, TimeUnit.SECONDS);
                    builder.maxConnectionLifeTime(60, TimeUnit.SECONDS);
                })
                .applyToSocketSettings(builder -> {
                    builder.connectTimeout(connectionTimeoutMs != null ? connectionTimeoutMs : 10000, TimeUnit.MILLISECONDS);
                    builder.readTimeout(30000, TimeUnit.MILLISECONDS);
                })
                .build();

        MongoClient mongoClient = MongoClients.create(settings);
        return new MongoTemplate(mongoClient, databaseName);
    }

    /**
     * Create a MongoClient from this metadata.
     *
     * @return The created MongoClient
     */
    public MongoClient toMongoClient() {
        MongoClientSettings settings = MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(connectionString))
                .applyToConnectionPoolSettings(builder -> {
                    builder.maxSize(maxPoolSize != null ? maxPoolSize : 20);
                    builder.minSize(minPoolSize != null ? minPoolSize : 5);
                    builder.maxConnectionIdleTime(30, TimeUnit.SECONDS);
                    builder.maxConnectionLifeTime(60, TimeUnit.SECONDS);
                })
                .applyToSocketSettings(builder -> {
                    builder.connectTimeout(connectionTimeoutMs != null ? connectionTimeoutMs : 10000, TimeUnit.MILLISECONDS);
                    builder.readTimeout(30000, TimeUnit.MILLISECONDS);
                })
                .build();

        return MongoClients.create(settings);
    }
}
