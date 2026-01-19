package ai.kolate.project_manager.dto.trial;

import lombok.Data;

@Data
public class TrialShareUserDTO {
    private String auth0Id;
    private String firstName;
    private String lastName;
    private String email;
    private String avatarUrl;
    private String jobTitle;
}
