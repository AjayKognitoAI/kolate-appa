package ai.kolate.enterprise_manager.dto.onboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnterpriseInviteResponse {

    private UUID enterpriseId;
    private String enterpriseName;
    private String enterpriseDomain;
    private String adminEmail;
    private String message;
}
