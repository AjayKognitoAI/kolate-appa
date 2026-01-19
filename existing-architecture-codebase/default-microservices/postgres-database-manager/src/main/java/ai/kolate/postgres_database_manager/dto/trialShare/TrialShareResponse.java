package ai.kolate.postgres_database_manager.dto.trialShare;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class TrialShareResponse {
    private UUID id;
    private String projectId;
    private String trialSlug;
    private String executionId;
    private UserSummary sender;
    private List<UserSummary> recipients;
    private Instant createdAt;
}

