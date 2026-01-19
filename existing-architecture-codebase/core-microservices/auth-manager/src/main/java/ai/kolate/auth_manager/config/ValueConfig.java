package ai.kolate.auth_manager.config;

import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
@Data
public class ValueConfig {
    @Value("${auth0.domain}")
    private String auth0Domain;
    @Value("${auth0.mgmt-client-id}")
    private String auth0MgmtClientId;
    @Value("${auth0.mgmt-client-secret}")
    private String auth0MgmtClientSecret;
    @Value("${auth0.mgmt-audience}")
    private String auth0MgmtAudience;
    @Value("${auth0.self-service-profile}")
    private String auth0SspId;
    @Value("${auth0.app-client-id}")
    private String auth0AppClientId;
}
