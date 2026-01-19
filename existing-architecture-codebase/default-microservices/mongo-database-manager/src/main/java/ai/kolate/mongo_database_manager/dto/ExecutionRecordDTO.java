package ai.kolate.mongo_database_manager.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class ExecutionRecordDTO {
    private String userId;
    private List<Map<String, Object>> basePrediction;
    private Map<String,Object> basePatientData;
}
