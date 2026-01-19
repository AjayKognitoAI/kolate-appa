package ai.kolate.project_manager.exception;

public class ProjectServiceException extends RuntimeException {
    
    public ProjectServiceException(String message) {
        super(message);
    }
    
    public ProjectServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
