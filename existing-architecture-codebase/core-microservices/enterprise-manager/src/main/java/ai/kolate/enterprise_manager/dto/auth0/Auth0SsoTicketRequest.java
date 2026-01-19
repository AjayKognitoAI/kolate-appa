package ai.kolate.enterprise_manager.dto.auth0;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Auth0SsoTicketRequest {
    @NotBlank(message = "Display name is required")
    @Pattern(regexp = "^[a-zA-Z0-9 ]+$", message = "Display name can only contain letters, numbers, and spaces")
    private String displayName;

    private String iconUrl;

    private List<String> domainAliases;

    @NotBlank(message = "Organization id is required")
    private String organizationId;
}
