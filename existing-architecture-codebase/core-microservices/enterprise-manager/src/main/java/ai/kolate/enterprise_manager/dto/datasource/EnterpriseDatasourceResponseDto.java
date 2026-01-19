package ai.kolate.enterprise_manager.dto.datasource;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    @JsonProperty("organization_id")
    private String organizationId;
    @JsonProperty("db_type")
    private String dbType;
    @JsonProperty("datasource_url")
    private String datasourceUrl;
    @JsonProperty("datasource_username")
    private String datasourceUsername;
    @JsonProperty("datasource_password")
    private String datasourcePassword;
    @JsonProperty("datasource_schema")
    private String datasourceSchema;
    // We intentionally don't include the password in the response for security reasons
}
