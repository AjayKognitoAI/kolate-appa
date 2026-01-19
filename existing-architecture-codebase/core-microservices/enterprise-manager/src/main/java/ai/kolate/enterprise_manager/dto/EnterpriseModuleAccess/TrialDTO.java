package ai.kolate.enterprise_manager.dto.EnterpriseModuleAccess;
import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrialDTO {

    private Integer id;
    private Integer moduleId;
    private String name;
    private String iconUrl;
    private String description;
    private String slug;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Boolean trialAccess;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
