package ai.kolate.project_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

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
    private UUID roleId;
    private String roleName;
}
