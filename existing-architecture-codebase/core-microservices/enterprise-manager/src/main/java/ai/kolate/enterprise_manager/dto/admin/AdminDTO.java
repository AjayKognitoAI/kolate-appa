package ai.kolate.enterprise_manager.dto.admin;

import ai.kolate.enterprise_manager.model.enums.UserType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDTO {
    private UUID id;
    private String auth0Id;
    private String firstName;
    private String lastName;
    private String email;
    private UserType userType;
    private String organizationId;
    private UUID enterpriseId;
    private String enterpriseName;
}
