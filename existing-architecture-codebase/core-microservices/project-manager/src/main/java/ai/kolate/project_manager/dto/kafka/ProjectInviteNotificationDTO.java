package ai.kolate.project_manager.dto.kafka;

import ai.kolate.project_manager.dto.ProjectUserRequest;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ProjectInviteNotificationDTO {
    private String type;
    private String senderId;
    private List<ProjectUserRequest> projectUsers;
    private String projectId;
    private String projectName;
    String orgId;
}
