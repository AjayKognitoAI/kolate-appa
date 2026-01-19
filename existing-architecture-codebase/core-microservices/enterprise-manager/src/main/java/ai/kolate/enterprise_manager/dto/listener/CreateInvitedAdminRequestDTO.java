package ai.kolate.enterprise_manager.dto.listener;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateInvitedAdminRequestDTO {
    private String organizationId;
    private String adminEmail;
    private String adminAuth0Id;
    private String firstName;
    private String lastName;
}
