package ai.kolate.project_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserProjectRoleWithPermissionsDTO {
    private UUID projectId;
    private String projectName;
    private String role;
    private UUID roleId;
    private Map<String, String> permissions; // ModuleType -> AccessType
}