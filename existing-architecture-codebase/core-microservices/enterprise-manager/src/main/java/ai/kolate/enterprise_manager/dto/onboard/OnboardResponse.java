package ai.kolate.enterprise_manager.dto.onboard;

import ai.kolate.enterprise_manager.dto.auth0.Auth0OrganizationResponse;
import ai.kolate.enterprise_manager.dto.auth0.Auth0SsoTicketResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OnboardResponse {
    Auth0OrganizationResponse organization;
    Auth0SsoTicketResponse ticket;
}
