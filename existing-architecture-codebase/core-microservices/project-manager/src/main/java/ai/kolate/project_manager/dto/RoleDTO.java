package ai.kolate.project_manager.dto;

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
