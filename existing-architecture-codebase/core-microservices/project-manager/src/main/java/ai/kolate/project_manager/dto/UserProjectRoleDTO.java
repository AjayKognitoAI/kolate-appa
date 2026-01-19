package ai.kolate.project_manager.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class UserProjectRoleDTO {
    UUID projectId;
    String projectName;
    String role;
}
