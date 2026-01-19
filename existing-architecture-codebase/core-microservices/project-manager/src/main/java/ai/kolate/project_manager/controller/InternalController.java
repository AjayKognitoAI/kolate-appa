package ai.kolate.project_manager.controller;

import ai.kolate.project_manager.dto.GlobalResponse;
import ai.kolate.project_manager.dto.PagedResponse;
import ai.kolate.project_manager.dto.ProjectStatsResponse;
import ai.kolate.project_manager.dto.ProjectSummaryResponse;
import ai.kolate.project_manager.model.enums.RequestStatus;
import ai.kolate.project_manager.service.ProjectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@Slf4j
@RequestMapping("/internal/project-manager")
public class InternalController {

    private final ProjectService projectService;

    @GetMapping("/v1/projects")
    public ResponseEntity<PagedResponse<ProjectSummaryResponse>> getAllProjects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(name = "sort_by", defaultValue = "createdAt") String sortBy,
            @RequestParam(name = "sort_direction", defaultValue = "desc") String sortDirection) {
        try {
            log.info("Retrieving all projects - page: {}, size: {}", page, size);
            PagedResponse<ProjectSummaryResponse> pagedResponse = projectService.getAllProjects(page, size, sortBy, sortDirection);
            return new ResponseEntity<>(pagedResponse, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Failed to retrieve all projects: {}", e.getMessage());
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/v1/projects/statistics")
    public ResponseEntity<ProjectStatsResponse> getEnterpriseProjectStats() {
        try {
            log.info("Fetching enterprise project statistics");
            ProjectStatsResponse enterpriseProjectStats = projectService.getEnterpriseProjectStats();
            return new ResponseEntity<>(enterpriseProjectStats, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Failed to fetch enterprise project stats : {}", e.getMessage());
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
