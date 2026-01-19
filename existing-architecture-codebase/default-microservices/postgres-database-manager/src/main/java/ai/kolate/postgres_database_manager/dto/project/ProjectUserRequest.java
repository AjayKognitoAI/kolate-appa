package ai.kolate.postgres_database_manager.dto.project;

import ai.kolate.postgres_database_manager.model.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectUserRequest {

    @NotBlank(message = "User Auth0 ID is required")
    private String userAuth0Id;

    private UUID roleId;

    private String role;

}
