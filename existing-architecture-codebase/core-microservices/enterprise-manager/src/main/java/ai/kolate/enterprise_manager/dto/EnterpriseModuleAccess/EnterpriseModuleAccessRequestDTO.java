package ai.kolate.enterprise_manager.dto.EnterpriseModuleAccess;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;
import java.util.UUID;

// Request DTOs
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnterpriseModuleAccessRequestDTO {

    @NotNull(message = "Enterprise ID is required")
    private UUID enterpriseId;

    @NotNull(message = "Organization ID is required")
    private String organizationId;

    @Valid
    private List<AccessRequestDTO> grantAccess;

    @Valid
    private List<AccessRequestDTO> revokeAccess;
}
