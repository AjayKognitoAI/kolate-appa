package ai.kolate.project_manager.dto;

import ai.kolate.project_manager.model.enums.RequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GlobalResponse {
    private RequestStatus state;
    private String status;
    private String message;
    private Object data;
}
