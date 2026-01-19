package ai.kolate.mongo_database_manager.exception;

import ai.kolate.mongo_database_manager.dto.GlobalResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Global exception handler for the MongoDB Database Manager service.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MongoDatasourceException.class)
    public ResponseEntity<GlobalResponse> handleMongoDatasourceException(MongoDatasourceException ex) {
        log.error("MongoDB datasource exception: {}", ex.getMessage(), ex);
        
        GlobalResponse response = GlobalResponse.builder()
                .status("ERROR")
                .message(ex.getMessage())
                .data(null)
                .build();
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    @ExceptionHandler(TenantNotFoundException.class)
    public ResponseEntity<GlobalResponse> handleTenantNotFoundException(TenantNotFoundException ex) {
        log.error("Tenant not found: {}", ex.getMessage(), ex);
        
        GlobalResponse response = GlobalResponse.builder()
                .status("ERROR")
                .message(ex.getMessage())
                .data(null)
                .build();
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<GlobalResponse> handleGenericException(Exception ex) {
        log.error("Unexpected error occurred: {}", ex.getMessage(), ex);
        
        GlobalResponse response = GlobalResponse.builder()
                .status("ERROR")
                .message("An unexpected error occurred")
                .data(null)
                .build();
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
