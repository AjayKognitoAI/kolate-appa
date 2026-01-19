package ai.kolate.user_manager.dto;

import ai.kolate.user_manager.model.enums.UserStatus;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserResponseDTO {
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
