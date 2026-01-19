package ai.kolate.postgres_database_manager.dto.project;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class RoleDTO {
    private UUID id;
    private String name;
    private String description;
}
