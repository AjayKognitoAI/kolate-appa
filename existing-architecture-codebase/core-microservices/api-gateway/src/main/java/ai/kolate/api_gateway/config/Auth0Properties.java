package ai.kolate.api_gateway.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "auth0")
public class Auth0Properties {
    private String domain;
    private String audience;
    private String issuer;
}
