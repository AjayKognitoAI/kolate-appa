package ai.kolate.project_manager.exception;

public class FeignClientException extends RuntimeException {
    
    private final int statusCode;
    
    public FeignClientException(String message, int statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
    
    public FeignClientException(String message, int statusCode, Throwable cause) {
        super(message, cause);
        this.statusCode = statusCode;
    }
    
    public int getStatusCode() {
        return statusCode;
    }
}
