package ai.kolate.postgres_database_manager.dto.project;

import java.util.UUID;

public interface RolePermissionDTO {
    UUID getRoleId();
    String getRoleName();
    String getModule();
    String getAccessType();
    String getRoleDescription();
}

