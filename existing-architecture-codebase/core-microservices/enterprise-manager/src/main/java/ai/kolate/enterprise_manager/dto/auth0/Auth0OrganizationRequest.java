package ai.kolate.enterprise_manager.dto.auth0;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Auth0OrganizationRequest {
    @NotBlank(message = "Display name is required")
    @Pattern(regexp = "^[a-zA-Z0-9 ]+$", message = "Display name can only contain letters, numbers, and spaces")
    private String displayName;

    private String logoUrl;

    private String primaryColor;

    private String pageBackgroundColor;
}
