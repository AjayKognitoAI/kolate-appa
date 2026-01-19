package ai.kolate.api_gateway.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CorsConfigService {

    private final CorsProperties properties;

    public CorsConfigService(CorsProperties properties) {
        this.properties = properties;
    }

    public List<String> getAllowedOrigins() {
        return properties.getAllowedOrigins();
    }

    public List<String> getAllowedMethods() {
        return properties.getAllowedMethods();
    }

    public List<String> getAllowedHeaders() {
        return properties.getAllowedHeaders();
    }

    public boolean allowCredentials() {
        // Enforce CORS spec: allowCredentials must be false if using "*"
        return !getAllowedOrigins().contains("*") && Boolean.TRUE.equals(properties.getAllowCredentials());
    }

    public Long maxAge() {
        return properties.getMaxAge();
    }
}