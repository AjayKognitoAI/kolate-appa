package ai.kolate.mongo_database_manager.exception;

/**
 * Custom exception for MongoDB datasource-related errors.
 */
public class MongoDatasourceException extends RuntimeException {
    
    public MongoDatasourceException(String message) {
        super(message);
    }

    public MongoDatasourceException(String message, Throwable cause) {
        super(message, cause);
    }
}
