package ai.kolate.postgres_database_manager.dto.project;

import java.util.UUID;

public interface UserProjectRoleDTO {
    UUID getProjectId();
    String getProjectName();
    String getRole();
    UUID getRoleId();
}

