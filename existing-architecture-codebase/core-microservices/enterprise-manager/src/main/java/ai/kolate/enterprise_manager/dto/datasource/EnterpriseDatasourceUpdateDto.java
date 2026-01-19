package ai.kolate.enterprise_manager.dto.datasource;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnterpriseDatasourceUpdateDto {
    private String datasourceUrl;
    private String datasourceUsername;
    private String datasourcePassword;
    private String datasourceSchema;
}
