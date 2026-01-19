package ai.kolate.enterprise_manager.exception;

import ai.kolate.enterprise_manager.dto.GlobalResponse;
import feign.FeignException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * Handles exceptions thrown by Feign clients.
     *
     * @param e The Feign client exception
     * @return ResponseEntity with error details
     */
    @ExceptionHandler(FeignClientException.class)
    public ResponseEntity<GlobalResponse> handleFeignClientException(FeignClientException e) {
        log.error("Feign client error occurred", e);
        
        HttpStatus status = HttpStatus.valueOf(e.getStatus());
        if (status.is5xxServerError()) {
            status = HttpStatus.SERVICE_UNAVAILABLE;
        } else if (status.is4xxClientError()) {
            status = HttpStatus.BAD_REQUEST;
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        }
        
        String message = String.format("External service error: %s", e.getMessage());
        
        GlobalResponse response = GlobalResponse.builder()
                .state("ERROR")
                .status(status.toString())
                .message(message)
                .build();
                
        return new ResponseEntity<>(response, status);
    }
    
    /**
     * Handles generic Feign exceptions.
     *
     * @param e The Feign exception
     * @return ResponseEntity with error details
     */
    @ExceptionHandler(FeignException.class)
    public ResponseEntity<GlobalResponse> handleFeignException(FeignException e) {
        log.error("Feign exception occurred", e);
        
        HttpStatus status = HttpStatus.valueOf(e.status());
        if (status.is5xxServerError()) {
            status = HttpStatus.SERVICE_UNAVAILABLE;
        } else if (status.is4xxClientError()) {
            status = HttpStatus.BAD_REQUEST;
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        }
        
        String message = String.format("External service error: %s", e.getMessage());
        
        GlobalResponse response = GlobalResponse.builder()
                .state("ERROR")
                .status(status.toString())
                .message(message)
                .build();
                
        return new ResponseEntity<>(response, status);
    }
}
