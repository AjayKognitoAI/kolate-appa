package ai.kolate.enterprise_manager.dto.EnterpriseModuleAccess;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccessErrorDTO {

    private Integer moduleId;
    private Integer trialId;
    private String action; // "GRANT" or "REVOKE"
    private String error;

}
