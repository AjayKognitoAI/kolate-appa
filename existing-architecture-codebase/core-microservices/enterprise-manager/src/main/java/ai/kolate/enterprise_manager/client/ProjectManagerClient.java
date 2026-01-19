package ai.kolate.enterprise_manager.client;

import ai.kolate.enterprise_manager.config.FeignConfig;
import ai.kolate.enterprise_manager.dto.PagedResponse;
import ai.kolate.enterprise_manager.dto.project.ProjectStatsResponse;
import ai.kolate.enterprise_manager.dto.project.ProjectSummaryResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "${feign.clients.project-manager.name}",
        path = "${feign.clients.project-manager.internal-path}",
        configuration = FeignConfig.class)
public interface ProjectManagerClient {

    @GetMapping("/v1/projects")
    PagedResponse<ProjectSummaryResponse> getAllProjects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(name = "sort_by", defaultValue = "createdAt") String sortBy,
            @RequestParam(name = "sort_direction", defaultValue = "desc") String sortDirection,
            @RequestHeader("org-id") String orgId);

    @GetMapping("/v1/projects/statistics")
    ProjectStatsResponse getEnterpriseProjectStats(@RequestHeader("org-id") String orgId);
}
