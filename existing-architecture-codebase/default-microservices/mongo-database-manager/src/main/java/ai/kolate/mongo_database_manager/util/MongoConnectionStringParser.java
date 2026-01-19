package ai.kolate.mongo_database_manager.util;

import lombok.extern.slf4j.Slf4j;

import java.net.URI;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Utility class for parsing MongoDB connection strings and extracting components.
 */
@Slf4j
public class MongoConnectionStringParser {

    // Pattern to match MongoDB connection string format:
    // mongodb://[username:password@]host1[:port1][,host2[:port2],...]/[database][?options]
    private static final Pattern MONGO_URI_PATTERN = Pattern.compile(
            "mongodb://(?:([^:]+):([^@]+)@)?([^/]+)(?:/([^?]+))?(?:\\?(.+))?"
    );

    /**
     * Parse MongoDB connection string and extract database name.
     *
     * @param connectionString The MongoDB connection string
     * @return The database name, or null if not found
     */
    public static String extractDatabaseName(String connectionString) {
        if (connectionString == null || connectionString.isEmpty()) {
            return null;
        }

        try {
            // Try using URI parsing first
            URI uri = URI.create(connectionString);
            String path = uri.getPath();
            if (path != null && path.length() > 1) {
                // Remove leading slash and return database name
                String dbName = path.substring(1);
                // Remove any query parameters
                int queryIndex = dbName.indexOf('?');
                if (queryIndex > 0) {
                    dbName = dbName.substring(0, queryIndex);
                }
                if (!dbName.isEmpty()) {
                    log.debug("Extracted database name '{}' from connection string", dbName);
                    return dbName;
                }
            }

            // Fallback to regex parsing
            Matcher matcher = MONGO_URI_PATTERN.matcher(connectionString);
            if (matcher.matches()) {
                String database = matcher.group(4);
                if (database != null && !database.isEmpty()) {
                    log.debug("Extracted database name '{}' from connection string using regex", database);
                    return database;
                }
            }

        } catch (Exception e) {
            log.warn("Failed to parse database name from connection string: {}", connectionString, e);
        }

        return null;
    }

    /**
     * Parse MongoDB connection string and extract username.
     *
     * @param connectionString The MongoDB connection string
     * @return The username, or null if not found
     */
    public static String extractUsername(String connectionString) {
        if (connectionString == null || connectionString.isEmpty()) {
            return null;
        }

        try {
            Matcher matcher = MONGO_URI_PATTERN.matcher(connectionString);
            if (matcher.matches()) {
                String username = matcher.group(1);
                if (username != null && !username.isEmpty()) {
                    log.debug("Extracted username from connection string");
                    return username;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse username from connection string: {}", connectionString, e);
        }

        return null;
    }

    /**
     * Parse MongoDB connection string and extract host:port.
     *
     * @param connectionString The MongoDB connection string
     * @return The host:port string, or null if not found
     */
    public static String extractHostAndPort(String connectionString) {
        if (connectionString == null || connectionString.isEmpty()) {
            return null;
        }

        try {
            Matcher matcher = MONGO_URI_PATTERN.matcher(connectionString);
            if (matcher.matches()) {
                String hostPort = matcher.group(3);
                if (hostPort != null && !hostPort.isEmpty()) {
                    log.debug("Extracted host:port '{}' from connection string", hostPort);
                    return hostPort;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse host:port from connection string: {}", connectionString, e);
        }

        return null;
    }

    /**
     * Build MongoDB connection string from individual components.
     *
     * @param host The host (with optional port)
     * @param username The username (optional)
     * @param password The password (optional)
     * @param database The database name
     * @param authSource The authentication source database (optional)
     * @return The constructed connection string
     */
    public static String buildConnectionString(String host, String username, String password, 
                                             String database, String authSource) {
        StringBuilder sb = new StringBuilder("mongodb://");

        // Add credentials if provided
        if (username != null && !username.isEmpty() && password != null && !password.isEmpty()) {
            sb.append(username).append(":").append(password).append("@");
        }

        // Add host
        if (host == null || host.isEmpty()) {
            throw new IllegalArgumentException("Host is required");
        }
        sb.append(host);

        // Add database
        if (database != null && !database.isEmpty()) {
            sb.append("/").append(database);
        }

        // Add auth source as query parameter
        if (authSource != null && !authSource.isEmpty()) {
            sb.append("?authSource=").append(authSource);
        }

        String connectionString = sb.toString();
        log.debug("Built connection string: {}", maskPassword(connectionString));
        return connectionString;
    }

    /**
     * Mask password in connection string for logging purposes.
     *
     * @param connectionString The connection string
     * @return The connection string with password masked
     */
    public static String maskPassword(String connectionString) {
        if (connectionString == null) {
            return null;
        }

        return connectionString.replaceAll("://([^:]+):([^@]+)@", "://$1:****@");
    }

    /**
     * Validate MongoDB connection string format.
     *
     * @param connectionString The connection string to validate
     * @return true if the format is valid, false otherwise
     */
    public static boolean isValidConnectionString(String connectionString) {
        if (connectionString == null || connectionString.isEmpty()) {
            return false;
        }

        try {
            return connectionString.startsWith("mongodb://") && 
                   MONGO_URI_PATTERN.matcher(connectionString).matches();
        } catch (Exception e) {
            log.warn("Invalid connection string format: {}", connectionString, e);
            return false;
        }
    }
}
