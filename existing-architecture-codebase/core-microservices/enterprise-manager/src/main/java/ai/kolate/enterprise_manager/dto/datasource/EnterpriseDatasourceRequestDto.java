package ai.kolate.enterprise_manager.dto.datasource;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnterpriseDatasourceRequestDto {
    
    @NotBlank(message = "Organization ID is required")
    private String organizationId;

    @NotBlank(message = "DB Type is required")
    private String dbType;

    @NotBlank(message = "Datasource URL is required")
    private String datasourceUrl;
    
    @NotBlank(message = "Datasource username is required")
    private String datasourceUsername;
    
    @NotBlank(message = "Datasource password is required")
    private String datasourcePassword;
    
    @NotBlank(message = "Datasource schema is required")
    private String datasourceSchema;
}
