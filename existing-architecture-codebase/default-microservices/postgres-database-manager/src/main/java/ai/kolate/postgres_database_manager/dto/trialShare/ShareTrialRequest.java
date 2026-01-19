package ai.kolate.postgres_database_manager.dto.trialShare;

import lombok.Data;

import java.util.List;

@Data
public class ShareTrialRequest {
    private String executionId;
    private String senderId;
    private List<String> recipients;
}