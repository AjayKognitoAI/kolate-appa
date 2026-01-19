package ai.kolate.postgres_database_manager.dto.project;

import ai.kolate.postgres_database_manager.model.enums.AccessType;
import ai.kolate.postgres_database_manager.model.enums.ModuleType;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public  class CreateRolePermissionRequest {

    @NotBlank(message = "Module is required")
    private String module; // ENUM: PREDICT, COMPARE, etc.

    @NotBlank(message = "Access type is required")
    private String accessType; // ENUM: HIDDEN, READ_ONLY, FULL_ACCESS
}
