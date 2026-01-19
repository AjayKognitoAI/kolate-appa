package ai.kolate.api_gateway.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.reactive.error.ErrorWebExceptionHandler;
import org.springframework.cloud.gateway.support.NotFoundException;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

/**
 * Global error handler for catching and logging all exceptions
 * in the API Gateway application
 */
@Configuration
@Order(-2) // High precedence, after netty but before WebFlux
@Slf4j
public class GlobalErrorHandler implements ErrorWebExceptionHandler {

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        ServerHttpRequest request = exchange.getRequest();
        ServerHttpResponse response = exchange.getResponse();

        // Determine appropriate status code based on exception type
        HttpStatus status;
        String errorMessage;

        if (ex instanceof ResponseStatusException) {
            status = (HttpStatus) ((ResponseStatusException) ex).getStatusCode();
            errorMessage = ex.getMessage();
        } else if (ex instanceof NotFoundException) {
            status = HttpStatus.NOT_FOUND;
            errorMessage = "The requested resource was not found";
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            errorMessage = "An unexpected error occurred";
        }

        // Set the response status
        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        // Log the error
        String path = request.getURI().getPath();
        String method = request.getMethod().name();
        String clientIp = request.getRemoteAddress() != null ?
                request.getRemoteAddress().getAddress().getHostAddress() : "unknown";

        log.error("Request error: {} {} from IP: {} - Status: {} - Error: {}", 
                method, path, clientIp, status, errorMessage, ex);

        // Prepare error response
        String errorResponse = String.format(
                "{\"status\":%d,\"error\":\"%s\",\"message\":\"%s\",\"path\":\"%s\"}",
                status.value(),
                status.getReasonPhrase(),
                errorMessage.replace("\"", "\\\""),
                path
        );

        byte[] bytes = errorResponse.getBytes(StandardCharsets.UTF_8);
        DataBuffer buffer = response.bufferFactory().wrap(bytes);
        return response.writeWith(Mono.just(buffer));
    }
}
