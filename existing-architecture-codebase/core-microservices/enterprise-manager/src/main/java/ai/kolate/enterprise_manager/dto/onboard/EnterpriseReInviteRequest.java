package ai.kolate.enterprise_manager.dto.onboard;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EnterpriseReInviteRequest {
    @NotNull(message = "Enterprise ID is required")
    private UUID enterpriseId;
}
