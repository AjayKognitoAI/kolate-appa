package ai.kolate.enterprise_manager.dto.listener;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DataSourceProvisionedDTO {
    private String id;
    private String type;
    private String url;
    private String user;
    private String password;
    private String schema;
}
