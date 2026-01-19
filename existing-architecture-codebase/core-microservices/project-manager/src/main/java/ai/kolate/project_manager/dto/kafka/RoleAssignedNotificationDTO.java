package ai.kolate.project_manager.dto.kafka;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class RoleAssignedNotificationDTO {
    UUID projectId;
    String projectName;
    String roleName;
    String type;
    String senderId;
    String recipientId;
    String orgId;
}