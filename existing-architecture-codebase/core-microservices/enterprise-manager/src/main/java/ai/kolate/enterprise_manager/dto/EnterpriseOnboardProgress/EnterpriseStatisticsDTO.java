package ai.kolate.enterprise_manager.dto.EnterpriseOnboardProgress;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EnterpriseStatisticsDTO {
    private Long activeProjects;
    private Long completedProjects;
    private Long totalUsers;
}
