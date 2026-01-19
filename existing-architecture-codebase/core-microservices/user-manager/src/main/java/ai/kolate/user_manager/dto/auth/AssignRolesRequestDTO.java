package ai.kolate.user_manager.dto.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
