package ai.kolate.enterprise_manager.dto.enterprise;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnterpriseStatsDto {
    private long totalEnterprises;
    private long deactivatedEnterprises;
}
