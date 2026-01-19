package ai.kolate.user_manager.client;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@Data
@NoArgsConstructor
@AllArgsConstructor
@ConfigurationProperties(prefix = "app.data")
public class AppDataConfig {
//    @Value("${app.data.enterprise-admin-role-id}")
    private String enterpriseAdminRoleId;
//    @Value("${app.data.root-admin-role-name}")
    private String rootAdminRoleName;
//    @Value("${app.data.enterprise-member-role-id}")
    private String enterpriseMemberRoleId;
}
