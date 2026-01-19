package ai.kolate.enterprise_manager.dto.EnterpriseModuleAccess;

import jakarta.validation.constraints.NotNull;
import lombok.*;


@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccessRequestDTO {

    @NotNull(message = "Module ID is required")
    private Integer moduleId;

    private Integer trialId; // Nullable for standalone modules
}

