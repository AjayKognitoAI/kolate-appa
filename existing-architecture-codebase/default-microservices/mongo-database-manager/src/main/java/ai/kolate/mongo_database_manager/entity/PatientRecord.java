package ai.kolate.mongo_database_manager.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientRecord {
    @Id
    private String recordId;
    private Map<String, Object> patientData;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
