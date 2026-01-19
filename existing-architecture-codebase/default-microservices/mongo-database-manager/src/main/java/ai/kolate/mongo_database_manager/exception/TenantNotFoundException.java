package ai.kolate.mongo_database_manager.exception;

/**
 * Custom exception for tenant-related errors.
 */
public class TenantNotFoundException extends RuntimeException {
    
    public TenantNotFoundException(String message) {
        super(message);
    }

    public TenantNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}
