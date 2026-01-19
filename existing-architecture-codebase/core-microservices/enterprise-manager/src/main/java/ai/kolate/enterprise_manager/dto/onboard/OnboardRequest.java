package ai.kolate.enterprise_manager.dto.onboard;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OnboardRequest {
    @NotNull(message = "Enterprise ID is required")
    private UUID enterpriseId;

//    @NotBlank(message = "Display name is required")
//    @Pattern(regexp = "^[a-zA-Z0-9 .]+$", message = "Display name can only contain letters, numbers, and spaces")
//    private String displayName;

    private String logoUrl;

    private String primaryColor;

    private String pageBackgroundColor;

    private List<String> domainAliases;
}
