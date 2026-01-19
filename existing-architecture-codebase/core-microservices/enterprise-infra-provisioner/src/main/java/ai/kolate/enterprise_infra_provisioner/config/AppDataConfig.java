package ai.kolate.enterprise_infra_provisioner.config;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Configuration
public class AppDataConfig {
    @Value("${app.data.host-address}")
    private String hostAddress;
}
