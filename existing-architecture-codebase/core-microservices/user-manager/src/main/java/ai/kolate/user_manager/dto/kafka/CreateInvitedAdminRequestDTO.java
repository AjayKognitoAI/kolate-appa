package ai.kolate.user_manager.dto.kafka;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class CreateInvitedAdminRequestDTO {
    private String firstName;
    private String lastName;
    private String adminAuth0Id;
    private String organizationId;
    private String adminEmail;
}
