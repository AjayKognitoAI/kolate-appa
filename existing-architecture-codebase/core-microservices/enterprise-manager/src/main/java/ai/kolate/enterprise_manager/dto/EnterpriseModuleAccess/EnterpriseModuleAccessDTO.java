package ai.kolate.enterprise_manager.dto.EnterpriseModuleAccess;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnterpriseModuleAccessDTO {
    private UUID id;
    private UUID enterpriseId;
    private String organizationId;
    private Integer moduleId;
    private Integer trialId;
}
