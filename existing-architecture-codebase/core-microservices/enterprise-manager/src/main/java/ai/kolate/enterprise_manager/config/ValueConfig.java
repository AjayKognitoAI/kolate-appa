package ai.kolate.enterprise_manager.config;

import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
@Data
public class ValueConfig {
    @Value("${app.data.auth0-client}")
    private String auth0Client;
    @Value("${app.data.invite-url}")
    private String inviteUrl;
    @Value("${app.data.invite-template-name}")
    private String inviteTemplateName;
    @Value("${app.data.delete-init-notification-template-name}")
    private String enterpriseDeleteInitTemplateName;
    @Value("${app.data.enterprise-delete-request-template-name}")
    private String enterpriseDeleteRequestTemplateName;
    @Value("${app.data.kolate-support-email}")
    private String kolateSupportEmail;
    @Value("${app.data.schema-name-prefix}")
    private String schemaNamePrefix;
}