package ai.kolate.enterprise_manager.dto.listener;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateAdminRequestDTO {
    private String adminEmail;
    private String organizationId;
    private String auth0Id;
    private String firstName;
    private String lastName;
}
