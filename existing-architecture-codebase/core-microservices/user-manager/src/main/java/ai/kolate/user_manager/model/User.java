package ai.kolate.user_manager.model;

import ai.kolate.user_manager.model.enums.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    private UUID id;
    private String auth0Id;
    private String organizationId;
    private String firstName;
    private String lastName;
    private String avatarUrl;
    private UserStatus status;
    private String email;
    private String mobile;
}
