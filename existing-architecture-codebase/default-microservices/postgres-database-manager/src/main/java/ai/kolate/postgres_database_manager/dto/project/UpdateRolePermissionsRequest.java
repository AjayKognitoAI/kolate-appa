package ai.kolate.postgres_database_manager.dto.project;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateRolePermissionsRequest {
    private UUID id;
    private String name;
    private String description;
    private Map<String, String> permissions;  // module → accessType
}
