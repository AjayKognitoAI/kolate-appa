package ai.kolate.enterprise_manager.dto.project;

import ai.kolate.enterprise_manager.model.enums.ProjectRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectUserResponse {

    private String userAuth0Id;
    private String firstName;
    private String lastName;
    private String email;
    private String avatarUrl;
    private String jobTitle;
    private ProjectRole role;
}
