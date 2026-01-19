package ai.kolate.enterprise_manager.dto.kafka;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DataSourceMessage {
    private String id;
    private String database;
    private String user;
    private String password;
    private String schema;
}
