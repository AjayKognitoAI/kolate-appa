package ai.kolate.project_manager.dto.trial;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ShareTrialRequestDTO {
    @NotNull(message = "Execution id required")
    private String executionId;

    @NotNull(message = "Sender id required")
    private String senderId;

    @NotEmpty(message = "Recipients required and cannot be empty")
    private List<String> recipients;
}
