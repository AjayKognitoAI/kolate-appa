package ai.kolate.project_manager.dto.trial;

import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
public class TrialShareResponseDTO {
    private UUID id;
    private String projectId;
    private String trialSlug;
    private String executionId;
    private ExecutionRecord execution;
    private TrialShareUserDTO sender;
    private List<TrialShareUserDTO> recipients;
    private Instant createdAt;
}
