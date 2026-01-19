package ai.kolate.enterprise_manager.dto.trial;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrialUpdateDTO {

    @NotNull(message = "Trial ID is required")
    private Integer id;

    private Integer moduleId;

    private String slug;

    private String name;

    private String iconUrl;

    private String description;
}
