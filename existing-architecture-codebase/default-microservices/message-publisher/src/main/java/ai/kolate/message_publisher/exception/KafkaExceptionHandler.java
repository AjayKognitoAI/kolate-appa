package ai.kolate.message_publisher.exception;

import ai.kolate.message_publisher.config.IServiceFactory;
import org.apache.commons.lang.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.stream.Collectors;

import static ai.kolate.message_publisher.util.Constants.HTTP_CLIENT_ERROR_EXCEPTION;
import static ai.kolate.message_publisher.util.Constants.HTTP_SERVER_ERROR_EXCEPTION;
import static ai.kolate.message_publisher.util.Constants.INTERNAL_SERVICE_EXCEPTION;
import static ai.kolate.message_publisher.util.Constants.INVALID_DATA_EXCEPTION;
import static ai.kolate.message_publisher.util.Constants.INVALID_REQUEST_EXCEPTION;
import static ai.kolate.message_publisher.util.Constants.STATUS_BAD_REQUEST;
import static ai.kolate.message_publisher.util.Constants.STATUS_INTERNAL_SERVER_ERROR;

@Order(Ordered.HIGHEST_PRECEDENCE)
@ControllerAdvice
public class KafkaExceptionHandler extends ResponseEntityExceptionHandler {

    public static final Logger EX_LOGGER = LoggerFactory.getLogger(KafkaExceptionHandler.class);



    @Autowired
    private IServiceFactory factory;

    /**
     * Handles server-side errors that occur while calling other services. This method logs the error,
     * parses the response body, and creates an appropriate error response.
     *
     * @param ex The HttpServerErrorException that occurred during the service call. This exception
     *     contains details about the server-side error.
     * @return ResponseEntity<Object> A response entity containing: - An ErrorResponse object with
     *     details parsed from the exception's response body - The HTTP status code from the original
     *     exception
     */
    @ExceptionHandler(HttpServerErrorException.class)
    protected ResponseEntity<Object> handleHttpServerErrorException(HttpServerErrorException ex) {
        EX_LOGGER.error(HTTP_SERVER_ERROR_EXCEPTION, ex);
        final var response = ex.getResponseBodyAsString();
        final var gson = factory.getGson();
        final ErrorResponse errorResponse = gson.fromJson(response, ErrorResponse.class);
        return new ResponseEntity<>(errorResponse, ex.getStatusCode());
    }

    /**
     * Handles client-side errors that occur while calling other services. This method logs the error,
     * parses the response body, and creates an appropriate error response.
     *
     * @param ex The HttpClientErrorException that occurred during the service call. This exception
     *     contains details about the client-side error.
     * @return ResponseEntity<Object> A response entity containing: - An ErrorResponse object with
     *     details parsed from the exception's response body - The HTTP status code from the original
     *     exception
     */
    @ExceptionHandler(HttpClientErrorException.class)
    protected ResponseEntity<Object> handleHttpClientErrorException(HttpClientErrorException ex) {
        EX_LOGGER.error(HTTP_CLIENT_ERROR_EXCEPTION, ex);
        final var response =
                StringUtils.isEmpty(ex.getResponseBodyAsString())
                        ? ex.getStatusText()
                        : ex.getResponseBodyAsString();
        final var gson = factory.getGson();
        final ErrorResponse errorResponse = gson.fromJson(response, ErrorResponse.class);
        return new ResponseEntity<>(errorResponse, ex.getStatusCode());
    }

    /**
     * Handles custom exceptions for invalid data. This method logs the error, creates an
     * ErrorResponse object with the exception message, and returns it wrapped in a ResponseEntity.
     *
     * @param ex The InvalidDataException that occurred. This exception is thrown when the data
     *     provided is invalid or does not meet the expected format.
     * @return ResponseEntity<Object> A response entity containing: - An ErrorResponse object with the
     *     exception message and a BAD_REQUEST status - An HTTP status of INTERNAL_SERVER_ERROR (500)
     */
    @ExceptionHandler(InvalidDataException.class)
    public ResponseEntity<ErrorResponse> handleInvalidDataException(InvalidDataException ex) {
        EX_LOGGER.error(INVALID_DATA_EXCEPTION, ex);
        var errorResponse = new ErrorResponse();
        errorResponse.setMessage(ex.getMessage());
        errorResponse.setStatus(STATUS_BAD_REQUEST);
        return ResponseEntity.badRequest().body(errorResponse);
    }

//    @ExceptionHandler(MethodArgumentNotValidException.class)
//    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex) {
//        EX_LOGGER.error(INVALID_DATA_EXCEPTION, ex);
//        String errorMessage = ex.getBindingResult().getFieldErrors().stream()
//                .map(fieldError -> "%s: %s".formatted(fieldError.getField(), fieldError.getDefaultMessage()))
//                .collect(Collectors.joining("; "));
//
//        var errorResponse = new ErrorResponse();
//        errorResponse.setMessage(errorMessage);
//        errorResponse.setStatus(STATUS_BAD_REQUEST);
//        return ResponseEntity.badRequest().body(errorResponse);
//    }

    /**
     * Handles custom exceptions for internal server errors. This method logs the error, creates an
     * ErrorResponse object with the exception message, and returns it wrapped in a ResponseEntity.
     *
     * @param ex The InternalServiceException that occurred. This exception is thrown when an internal
     *     server error is encountered during processing.
     * @return ResponseEntity<Object> A response entity containing: - An ErrorResponse object with the
     *     exception message and an INTERNAL_SERVER_ERROR status - An HTTP status of
     *     INTERNAL_SERVER_ERROR (500)
     */
    @ExceptionHandler(InternalServiceException.class)
    protected ResponseEntity<Object> handleInternalServiceException(InternalServiceException ex) {
        EX_LOGGER.error(INTERNAL_SERVICE_EXCEPTION, ex);
        final var errorResponse = new ErrorResponse();
        errorResponse.setMessage(ex.getMessage());
        errorResponse.setStatus(STATUS_INTERNAL_SERVER_ERROR);
        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /**
     * Handles custom exceptions for invalid requests. This method logs the error, creates an
     * ErrorResponse object with the exception message, and returns it wrapped in a ResponseEntity.
     *
     * @param ex The InvalidRequestException that occurred. This exception is thrown when the request
     *     is invalid or does not meet the expected format.
     * @return ResponseEntity<Object> A response entity containing: - An ErrorResponse object with the
     *     exception message and a BAD_REQUEST status - An HTTP status of INTERNAL_SERVER_ERROR (500)
     */
    @ExceptionHandler(InvalidRequestException.class)
    protected ResponseEntity<Object> handleInternalServiceException(InvalidRequestException ex) {
        EX_LOGGER.error(INVALID_REQUEST_EXCEPTION, ex);
        final var errorResponse = new ErrorResponse();
        errorResponse.setMessage(ex.getMessage());
        errorResponse.setStatus(STATUS_BAD_REQUEST);
        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
