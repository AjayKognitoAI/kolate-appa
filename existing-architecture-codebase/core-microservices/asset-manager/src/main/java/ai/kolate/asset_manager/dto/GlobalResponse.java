package ai.kolate.asset_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GlobalResponse {
    private String state;
    private String status;
    private String message;
    private Object data;
}
