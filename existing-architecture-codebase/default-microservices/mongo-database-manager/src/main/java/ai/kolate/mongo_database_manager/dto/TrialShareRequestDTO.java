package ai.kolate.mongo_database_manager.dto;

import lombok.Data;

import java.util.List;

@Data
public class TrialShareRequestDTO {
    private String executionId;
    private List<String> recipients;
}
