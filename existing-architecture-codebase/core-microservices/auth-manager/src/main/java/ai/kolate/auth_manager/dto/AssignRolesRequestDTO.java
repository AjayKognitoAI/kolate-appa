package ai.kolate.auth_manager.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AssignRolesRequestDTO {
    @JsonProperty("organization_id")
    private String organizationId;
    @JsonProperty("user_id")
    private String userId;
    @NotEmpty(message = "Roles list cannot be empty")
    private List<String> roles;
}
