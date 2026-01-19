package ai.kolate.enterprise_manager.exception;

import lombok.Getter;

/**
 * Exception thrown when a Feign client call fails.
 */
@Getter
public class FeignClientException extends RuntimeException {
    
    private final int status;
    private final String errorBody;

    public FeignClientException(int status, String message, String errorBody) {
        super(message);
        this.status = status;
        this.errorBody = errorBody;
    }
    
    public FeignClientException(String message, Throwable cause) {
        super(message, cause);
        this.status = 0;
        this.errorBody = null;
    }
}
