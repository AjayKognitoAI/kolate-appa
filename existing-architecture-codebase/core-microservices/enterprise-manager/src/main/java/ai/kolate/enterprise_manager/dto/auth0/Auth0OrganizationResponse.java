package ai.kolate.enterprise_manager.dto.auth0;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Auth0OrganizationResponse {
    private String id;
    private String name;
}
