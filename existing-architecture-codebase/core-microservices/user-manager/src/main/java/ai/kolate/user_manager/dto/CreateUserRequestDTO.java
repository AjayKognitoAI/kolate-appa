package ai.kolate.user_manager.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CreateUserRequestDTO {
    private String auth0Id;
    private String organizationId;
    private String firstName;
    private String lastName;
    private String avatarUrl;
    private String email;
    private String mobile;
}
