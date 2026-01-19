package ai.kolate.postgres_database_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnterpriseDatasourceResponseDto {
    private UUID id;
    private String organizationId;
    private String datasourceUrl;
    private String datasourceUsername;
    private String datasourcePassword;
    private String datasourceSchema;
}
