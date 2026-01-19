package ai.kolate.enterprise_manager.dto.kafka;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnterpriseDeleteRequestTemplateData {
    private String enterpriseName;
    private String reason;
}
