package ai.kolate.project_manager.dto.trial;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
public class ExecutionRecord {
    private String executionId;
    private String userId;
    private Map<String, Object> basePatientData;
    private List<Map<String, Object>> basePrediction;
    private String executedBy;
    private String executedAt;
    private String updatedBy;
    private String updatedAt;
}
