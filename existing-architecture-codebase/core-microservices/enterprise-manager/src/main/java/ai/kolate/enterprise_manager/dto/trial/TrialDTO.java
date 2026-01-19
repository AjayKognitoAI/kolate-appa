package ai.kolate.enterprise_manager.dto.trial;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrialDTO {

    private Integer id;
    private Integer moduleId;
    private String moduleName;
    private String slug;
    private String name;
    private String iconUrl;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
