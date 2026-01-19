package ai.kolate.project_manager.exception;

import feign.FeignException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ProjectNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleProjectNotFoundException(
            ProjectNotFoundException ex, WebRequest request) {
        log.error("Project not found: {}", ex.getMessage());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .message(ex.getMessage())
                .error("Project Not Found")
                .status(HttpStatus.NOT_FOUND.value())
                .path(request.getDescription(false).replace("uri=", ""))
                .timestamp(OffsetDateTime.now())
                .build();
                
        return new ResponseEntity<>(errorResponse, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(UserNotFoundInProjectException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFoundInProjectException(
            UserNotFoundInProjectException ex, WebRequest request) {
        log.error("User not found in project: {}", ex.getMessage());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .message(ex.getMessage())
                .error("User Not Found In Project")
                .status(HttpStatus.NOT_FOUND.value())
                .path(request.getDescription(false).replace("uri=", ""))
                .timestamp(OffsetDateTime.now())
                .build();
                
        return new ResponseEntity<>(errorResponse, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(ProjectServiceException.class)
    public ResponseEntity<ErrorResponse> handleProjectServiceException(
            ProjectServiceException ex, WebRequest request) {
        log.error("Project service error: {}", ex.getMessage(), ex);
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .message(ex.getMessage())
                .error("Service Error")
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .path(request.getDescription(false).replace("uri=", ""))
                .timestamp(OffsetDateTime.now())
                .build();
                
        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(FeignClientException.class)
    public ResponseEntity<ErrorResponse> handleFeignClientException(
            FeignClientException ex, WebRequest request) {
        log.error("Feign client error: {} (Status: {})", ex.getMessage(), ex.getStatusCode(), ex);
        
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode());
        ErrorResponse errorResponse = ErrorResponse.builder()
                .message(ex.getMessage())
                .error("External Service Error")
                .status(ex.getStatusCode())
                .path(request.getDescription(false).replace("uri=", ""))
                .timestamp(OffsetDateTime.now())
                .build();
                
        return new ResponseEntity<>(errorResponse, status);
    }

    @ExceptionHandler(FeignException.class)
    public ResponseEntity<ErrorResponse> handleFeignException(
            FeignException ex, WebRequest request) {
        log.error("Feign exception: {} (Status: {})", ex.getMessage(), ex.status(), ex);
        
        String message = "External service communication error";
        HttpStatus status = HttpStatus.valueOf(ex.status());
        
        // Extract more meaningful error messages based on status code
        switch (ex.status()) {
            case 404:
                message = "Requested resource not found in external service";
                break;
            case 400:
                message = "Invalid request sent to external service";
                break;
            case 401:
                message = "Authentication failed with external service";
                break;
            case 403:
                message = "Access denied by external service";
                break;
            case 500:
                message = "External service internal error";
                break;
            case 503:
                message = "External service unavailable";
                break;
        }
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .message(message)
                .error("External Service Error")
                .status(ex.status())
                .path(request.getDescription(false).replace("uri=", ""))
                .timestamp(OffsetDateTime.now())
                .build();
                
        return new ResponseEntity<>(errorResponse, status);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(
            MethodArgumentNotValidException ex, WebRequest request) {
        log.error("Validation error: {}", ex.getMessage());
        
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Validation failed");
        response.put("errors", errors);
        response.put("status", HttpStatus.BAD_REQUEST.value());
        response.put("path", request.getDescription(false).replace("uri=", ""));
        response.put("timestamp", OffsetDateTime.now());
        
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
            IllegalArgumentException ex, WebRequest request) {
        log.error("Illegal argument: {}", ex.getMessage());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .message(ex.getMessage())
                .error("Bad Request")
                .status(HttpStatus.BAD_REQUEST.value())
                .path(request.getDescription(false).replace("uri=", ""))
                .timestamp(OffsetDateTime.now())
                .build();
                
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex, WebRequest request) {
        log.error("Unexpected error: {}", ex.getMessage(), ex);
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .message("An unexpected error occurred")
                .error("Internal Server Error")
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .path(request.getDescription(false).replace("uri=", ""))
                .timestamp(OffsetDateTime.now())
                .build();
                
        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
