package ai.kolate.project_manager.exception;

public class UserNotFoundInProjectException extends RuntimeException {
    
    public UserNotFoundInProjectException(String message) {
        super(message);
    }
    
    public UserNotFoundInProjectException(String message, Throwable cause) {
        super(message, cause);
    }
}
