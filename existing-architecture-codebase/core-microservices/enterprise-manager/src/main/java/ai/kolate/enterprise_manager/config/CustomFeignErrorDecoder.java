package ai.kolate.enterprise_manager.config;

import ai.kolate.enterprise_manager.exception.FeignClientException;
import feign.Response;
import feign.codec.ErrorDecoder;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.IOUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Custom error decoder for Feign clients that converts Feign errors to FeignClientException.
 */
@Slf4j
public class CustomFeignErrorDecoder implements ErrorDecoder {

    private final ErrorDecoder defaultErrorDecoder = new Default();

    @Override
    public Exception decode(String methodKey, Response response) {
        String requestUrl = response.request().url();
        String requestMethod = response.request().httpMethod().name();
        int status = response.status();
        
        log.error("Feign client error: {} {} returned status {} - {}", requestMethod, requestUrl, status, response.reason());
        
        String errorBody = extractErrorBody(response);
        
        if (status >= 400 && status < 600) {
            return new FeignClientException(status, 
                    String.format("%s %s failed with status %d: %s", requestMethod, requestUrl, status, response.reason()),
                    errorBody);
        }
        
        return defaultErrorDecoder.decode(methodKey, response);
    }
    
    private String extractErrorBody(Response response) {
        try {
            if (response.body() != null) {
                return IOUtils.toString(response.body().asInputStream(), StandardCharsets.UTF_8);
            }
        } catch (IOException e) {
            log.warn("Failed to extract error body from Feign response", e);
        }
        return null;
    }
}
