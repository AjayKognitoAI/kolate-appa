package ai.kolate.enterprise_manager.dto.EnterpriseModuleAccess;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModuleDTO {

    private Integer id;
    private String name;
    private Boolean isStandalone;
    private String slug;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Boolean moduleAccess;

    private List<TrialDTO> trials;
}
