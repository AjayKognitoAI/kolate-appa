package ai.kolate.enterprise_manager.dto.kafka;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnterpriseInviteTemplateData {
    private String enterpriseName;
    private String adminEmail;
    private String enterpriseUrl;
    private String domain;
    private String inviteUrl;
}
