package ai.kolate.auth_manager.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "sso")
@Data
public class SSOProperties {
    private String domainVerification;
    private boolean showAsButton;
    private boolean showAsButtonForOrg;
    private boolean domainConnection;
}
