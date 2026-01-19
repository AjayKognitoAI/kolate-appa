package ai.kolate.postgres_database_manager.dto.project;

import java.util.UUID;

public interface DefaultRolePermissionDTO {
    UUID getRoleId();
    String getRoleName();
    String getDescription();
    String getModule();
    String getAccessType();
}

