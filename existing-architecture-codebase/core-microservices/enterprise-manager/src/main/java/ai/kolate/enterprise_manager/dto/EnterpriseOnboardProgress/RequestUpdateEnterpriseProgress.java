package ai.kolate.enterprise_manager.dto.EnterpriseOnboardProgress;

import ai.kolate.enterprise_manager.model.enums.EnterpriseOnboardStep;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RequestUpdateEnterpriseProgress {

    @NotNull(message = "Onboard step is required")
    private EnterpriseOnboardStep step;
}