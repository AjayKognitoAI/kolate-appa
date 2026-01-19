package ai.kolate.postgres_database_manager.dto.project;

import ai.kolate.postgres_database_manager.model.enums.AccessType;
import ai.kolate.postgres_database_manager.model.enums.ModuleType;
import lombok.Builder;
import lombok.Data;

import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class RoleResponseDTO {
    private UUID id;
    private String name;
    private String description;
    private Map<ModuleType, AccessType> permissions;
}
