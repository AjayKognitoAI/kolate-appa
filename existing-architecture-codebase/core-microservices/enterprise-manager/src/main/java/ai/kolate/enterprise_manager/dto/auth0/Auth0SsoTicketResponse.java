package ai.kolate.enterprise_manager.dto.auth0;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Auth0SsoTicketResponse {
    private String ticket;
}
