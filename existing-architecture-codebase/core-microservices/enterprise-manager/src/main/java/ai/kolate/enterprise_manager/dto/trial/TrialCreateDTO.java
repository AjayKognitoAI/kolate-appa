package ai.kolate.enterprise_manager.dto.trial;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrialCreateDTO {

    @NotNull(message = "Module ID is required")
    private Integer moduleId;

    @NotBlank(message = "Slug is required")
    private String slug;

    @NotBlank(message = "Name is required")
    private String name;

    private String iconUrl;

    private String description;
}
