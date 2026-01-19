package ai.kolate.postgres_database_manager.dto.project;

import ai.kolate.postgres_database_manager.model.ProjectUser;
import ai.kolate.postgres_database_manager.model.enums.ProjectStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectSummaryResponse {

    private UUID id;
    private String name;
    private String description;
    private ProjectStatus status;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
    private Long totalUsers;
    private Long adminCount;
    private Long managerCount;
    private Long memberCount;
    private String userRole;
    private List<ProjectUserResponse> projectUsers;
}
