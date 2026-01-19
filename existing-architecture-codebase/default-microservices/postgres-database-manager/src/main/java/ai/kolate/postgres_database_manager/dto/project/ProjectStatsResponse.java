package ai.kolate.postgres_database_manager.dto.project;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectStatsResponse {

    private long totalProjects;
    private long activeProjects;
    private long completedProjects;
    private long totalProjectUsers;
    private long totalAdmins;
    private long totalManagers;
    private long totalMembers;
    private double averageUsersPerProject;
}
