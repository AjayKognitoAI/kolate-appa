package ai.kolate.postgres_database_manager.controller;

import ai.kolate.postgres_database_manager.config.DatasourceContext;
import ai.kolate.postgres_database_manager.dto.PageableRequest;
import ai.kolate.postgres_database_manager.dto.PagedResponse;
import ai.kolate.postgres_database_manager.dto.project.*;
import ai.kolate.postgres_database_manager.model.Role;
import ai.kolate.postgres_database_manager.model.enums.ProjectStatus;
import ai.kolate.postgres_database_manager.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * REST controller for project management operations.
 * Handles HTTP requests for project CRUD operations and project-user associations with tenant awareness.
 */
@RestController
@RequestMapping("/internal/postgres-database-manager")
@RequiredArgsConstructor
@Slf4j
public class ProjectController {

    private final ProjectService projectService;
    private final DatasourceContext datasourceContext;

    // ===== PROJECT CRUD OPERATIONS =====

    /**
     * Create a new project.
     *
     * @param request The project creation request
     * @return The created project
     */
    @PostMapping("/v1/project")
    public ResponseEntity<?> createProject(@Valid @RequestBody CreateProjectRequest request) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to create project with name: {} for tenant: {}", request.getName(), tenantId);

        try {
            ProjectResponse createdProject = projectService.createProject(request);
            return new ResponseEntity<>(createdProject, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            log.warn("Project creation failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    /**
     * Update an existing project.
     *
     * @param projectId The project ID
     * @param request   The update request
     * @return The updated project or appropriate error status
     */
    @PutMapping("/v1/project/{projectId}")
    public ResponseEntity<ProjectResponse> updateProject(
            @PathVariable UUID projectId,
            @Valid @RequestBody UpdateProjectRequest request) {

        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to update project with ID: {} for tenant: {}", projectId, tenantId);

        try {
            ProjectResponse updatedProject = projectService.updateProject(projectId, request);
            return new ResponseEntity<>(updatedProject, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            log.warn("Project update failed: {}", e.getMessage());
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * Get a project by ID with complete details including users.
     *
     * @param projectId The project ID
     * @return The project with all details or 404 if not found
     */
    @GetMapping("/v1/project/{projectId}")
    public ResponseEntity<ProjectResponse> getProjectById(@PathVariable UUID projectId) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get project with ID: {} for tenant: {}", projectId, tenantId);

        try {
            ProjectResponse project = projectService.getProjectById(projectId);
            return new ResponseEntity<>(project, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            log.warn("Project not found: {}", e.getMessage());
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Get a project summary by ID (without user details).
     *
     * @param projectId The project ID
     * @return The project summary or 404 if not found
     */
    @GetMapping("/v1/project/{projectId}/summary")
    public ResponseEntity<ProjectSummaryResponse> getProjectSummaryById(@PathVariable UUID projectId) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get project summary with ID: {} for tenant: {}", projectId, tenantId);

        try {
            ProjectSummaryResponse projectSummary = projectService.getProjectSummaryById(projectId);
            return new ResponseEntity<>(projectSummary, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            log.warn("Project not found: {}", e.getMessage());
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Delete a project.
     *
     * @param projectId The project ID
     * @return 204 No Content on success, 404 if not found
     */
    @DeleteMapping("/v1/project/{projectId}")
    public ResponseEntity<Void> deleteProject(@PathVariable UUID projectId) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to delete project with ID: {} for tenant: {}", projectId, tenantId);

        try {
            projectService.deleteProject(projectId);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (IllegalArgumentException e) {
            log.warn("Project deletion failed: {}", e.getMessage());
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    // ===== PROJECT LISTING AND SEARCH OPERATIONS =====

    /**
     * Get all projects with pagination.
     *
     * @param page          Page number (0-based, default: 0)
     * @param size          Number of items per page (default: 20, max: 100)
     * @param sortBy        Field to sort by (optional)
     * @param sortDirection Sort direction - ASC or DESC (default: ASC)
     * @return Paginated list of project summaries
     */
    @GetMapping("/v1/projects")
    public ResponseEntity<PagedResponse<ProjectSummaryResponse>> getAllProjects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection) {

        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get all projects for tenant: {} - page: {}, size: {}", tenantId, page, size);

        PageableRequest pageableRequest = PageableRequest.builder()
                .page(page)
                .size(size)
                .sortBy(sortBy)
                .sortDirection(sortDirection)
                .build();

        PagedResponse<ProjectSummaryResponse> projects = projectService.getAllProjects(pageableRequest.toPageable());
        return new ResponseEntity<>(projects, HttpStatus.OK);
    }

    /**
     * Get projects by status with pagination.
     *
     * @param status        The project status (ACTIVE or COMPLETED)
     * @param page          Page number (0-based, default: 0)
     * @param size          Number of items per page (default: 20, max: 100)
     * @param sortBy        Field to sort by (optional)
     * @param sortDirection Sort direction - ASC or DESC (default: ASC)
     * @return Paginated list of projects with the specified status
     */
    @GetMapping("/v1/projects/status/{status}")
    public ResponseEntity<PagedResponse<ProjectSummaryResponse>> getProjectsByStatus(
            @PathVariable ProjectStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection) {

        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get projects by status: {} for tenant: {} - page: {}, size: {}",
                status, tenantId, page, size);

        PageableRequest pageableRequest = PageableRequest.builder()
                .page(page)
                .size(size)
                .sortBy(sortBy)
                .sortDirection(sortDirection)
                .build();

        PagedResponse<ProjectSummaryResponse> projects = projectService.getProjectsByStatus(status, pageableRequest.toPageable());
        return new ResponseEntity<>(projects, HttpStatus.OK);
    }

    /**
     * Search projects by name pattern with pagination.
     *
     * @param namePattern   The name pattern to search for
     * @param page          Page number (0-based, default: 0)
     * @param size          Number of items per page (default: 20, max: 100)
     * @param sortBy        Field to sort by (optional)
     * @param sortDirection Sort direction - ASC or DESC (default: ASC)
     * @return Paginated list of projects matching the name pattern
     */
    @GetMapping("/v1/projects/search")
    public ResponseEntity<PagedResponse<ProjectSummaryResponse>> searchProjectsByName(
            @RequestParam String namePattern,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection) {

        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to search projects by name: '{}' for tenant: {} - page: {}, size: {}",
                namePattern, tenantId, page, size);

        PageableRequest pageableRequest = PageableRequest.builder()
                .page(page)
                .size(size)
                .sortBy(sortBy)
                .sortDirection(sortDirection)
                .build();

        PagedResponse<ProjectSummaryResponse> projects = projectService.searchProjectsByName(namePattern, pageableRequest.toPageable());
        return new ResponseEntity<>(projects, HttpStatus.OK);
    }

    /**
     * Get projects created by a specific user with pagination.
     *
     * @param createdBy     The user who created the projects
     * @param page          Page number (0-based, default: 0)
     * @param size          Number of items per page (default: 20, max: 100)
     * @param sortBy        Field to sort by (optional)
     * @param sortDirection Sort direction - ASC or DESC (default: ASC)
     * @return Paginated list of projects created by the specified user
     */
    @GetMapping("/v1/projects/created-by/{createdBy}")
    public ResponseEntity<PagedResponse<ProjectSummaryResponse>> getProjectsByCreatedBy(
            @PathVariable String createdBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection) {

        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get projects created by: '{}' for tenant: {} - page: {}, size: {}",
                createdBy, tenantId, page, size);

        PageableRequest pageableRequest = PageableRequest.builder()
                .page(page)
                .size(size)
                .sortBy(sortBy)
                .sortDirection(sortDirection)
                .build();

        PagedResponse<ProjectSummaryResponse> projects = projectService.getProjectsByCreatedBy(createdBy, pageableRequest.toPageable());
        return new ResponseEntity<>(projects, HttpStatus.OK);
    }

    /**
     * Get projects created between specific dates.
     *
     * @param startDate The start date (inclusive)
     * @param endDate   The end date (inclusive)
     * @return List of projects created within the date range
     */
    @GetMapping("/v1/projects/created-between")
    public ResponseEntity<List<ProjectSummaryResponse>> getProjectsCreatedBetween(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate) {

        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get projects created between {} and {} for tenant: {}",
                startDate, endDate, tenantId);

        List<ProjectSummaryResponse> projects = projectService.getProjectsCreatedBetween(startDate, endDate);
        return new ResponseEntity<>(projects, HttpStatus.OK);
    }

    /**
     * Get projects by user Auth0 ID.
     *
     * @param userAuth0Id The user's Auth0 ID
     * @return List of projects the user is a member of
     */
    @GetMapping("/v1/projects/user/{userAuth0Id}")
    public ResponseEntity<List<ProjectSummaryResponse>> getProjectsByUser(@PathVariable String userAuth0Id) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get projects for user: {} in tenant: {}", userAuth0Id, tenantId);

        List<ProjectSummaryResponse> projects = projectService.getProjectsByUser(userAuth0Id);
        return new ResponseEntity<>(projects, HttpStatus.OK);
    }

    @GetMapping("/v1/projects/user/{userAuth0Id}/roles-permissions")
    public ResponseEntity<List<UserProjectRoleWithPermissionsDTO>> getUserProjectsWithRolesAndPermissions (
            @PathVariable String userAuth0Id) {

        String tenantId = datasourceContext.getTenantId();
        log.info("Fetching projects and roles for user {} in tenant {}", userAuth0Id, tenantId);

        return ResponseEntity.ok(projectService.getUserProjectsWithRolesAndPermissions(userAuth0Id));
    }

    // ===== PROJECT USER MANAGEMENT =====

    /**
     * Add a user to a project.
     *
     * @param projectId The project ID
     * @param request   The project user request
     * @return 201 Created on success, 400 if validation fails, 404 if project/user not found
     */
    @PostMapping("/v1/project/{projectId}/users")
    public ResponseEntity<Void> addUserToProject(
            @PathVariable UUID projectId,
            @Valid @RequestBody ProjectUserRequest request) {

        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to add user {} to project {} for tenant: {}",
                request.getUserAuth0Id(), projectId, tenantId);

        try {
            projectService.addUserToProject(projectId, request);
            return new ResponseEntity<>(HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            log.warn("Add user to project failed: {}", e.getMessage());
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * Remove a user from a project.
     *
     * @param projectId   The project ID
     * @param userAuth0Id The user's Auth0 ID
     * @return 204 No Content on success, 400 if user not in project, 404 if project not found
     */
    @DeleteMapping("/v1/project/{projectId}/users/{userAuth0Id}")
    public ResponseEntity<Void> removeUserFromProject(
            @PathVariable UUID projectId,
            @PathVariable String userAuth0Id) {

        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to remove user {} from project {} for tenant: {}",
                userAuth0Id, projectId, tenantId);

        try {
            projectService.removeUserFromProject(projectId, userAuth0Id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (IllegalArgumentException e) {
            log.warn("Remove user from project failed: {}", e.getMessage());
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * Get all users in a project.
     *
     * @param projectId The project ID
     * @return List of project users or 404 if project not found
     */
    @GetMapping("/v1/project/{projectId}/users")
    public ResponseEntity<List<ProjectUserResponse>> getProjectUsers(@PathVariable UUID projectId) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get users for project {} in tenant: {}", projectId, tenantId);

        try {
            List<ProjectUserResponse> users = projectService.getProjectUsers(projectId);
            return new ResponseEntity<>(users, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            log.warn("Get project users failed: {}", e.getMessage());
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Check if a user is in a project.
     *
     * @param projectId   The project ID
     * @param userAuth0Id The user's Auth0 ID
     * @return Boolean indicating if user is in project
     */
    @GetMapping("/v1/project/{projectId}/users/{userAuth0Id}/exists")
    public ResponseEntity<Boolean> isUserInProject(
            @PathVariable UUID projectId,
            @PathVariable String userAuth0Id) {

        String tenantId = datasourceContext.getTenantId();
        log.debug("Checking if user {} is in project {} for tenant: {}", userAuth0Id, projectId, tenantId);

        boolean exists = projectService.isUserInProject(projectId, userAuth0Id);
        return new ResponseEntity<>(exists, HttpStatus.OK);
    }

    // ===== PROJECT ROLE MANAGEMENT =====

    /**
     * Get all roles for a project.
     *
     * @param projectId The project ID
     * @return List of roles available in the project or 404 if project not found
     */
    @GetMapping("/v1/project/{projectId}/roles")
    public ResponseEntity<List<RoleDTO>> getProjectRoles(@PathVariable UUID projectId) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get roles for project {} in tenant: {}", projectId, tenantId);

        try {
            List<RoleDTO> roles = projectService.getProjectRoles(projectId);
            return new ResponseEntity<>(roles, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            log.warn("Get project roles failed: {}", e.getMessage());
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Get all roles with permissions for a project.
     *
     * @param projectId The project ID
     * @return List of roles with permissions for the project or 404 if project not found
     */
    @GetMapping("/v1/project/{projectId}/roles/with-permissions")
    public ResponseEntity<List<Role>> getProjectRolesWithPermissions(@PathVariable UUID projectId) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get roles with permissions for project {} in tenant: {}", projectId, tenantId);

        try {
            List<Role> roles = projectService.getProjectRolesWithPermissions(projectId);
            return new ResponseEntity<>(roles, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            log.warn("Get project roles with permissions failed: {}", e.getMessage());
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Attach/Assign a role to a user in a project.
     *
     * @param projectId   The project ID
     * @param userAuth0Id The user's Auth0 ID
     * @param roleId      The role ID to assign
     * @return 200 OK on success, 400 if validation fails, 404 if project/user/role not found
     */
    @PostMapping("/v1/project/{projectId}/users/{userAuth0Id}/role/{roleId}")
    public ResponseEntity<Void> attachRoleToUser(
            @PathVariable UUID projectId,
            @PathVariable String userAuth0Id,
            @PathVariable UUID roleId) {

        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to attach role {} to user {} in project {} for tenant: {}",
                roleId, userAuth0Id, projectId, tenantId);

        try {
            projectService.attachRoleToUser(projectId, userAuth0Id, roleId);
            return new ResponseEntity<>(HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            log.warn("Attach role to user failed: {}", e.getMessage());
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * Change a user's role in a project.
     *
     * @param projectId   The project ID
     * @param userAuth0Id The user's Auth0 ID
     * @param newRoleId   The new role ID
     * @return 200 OK on success, 400 if user not in project, 404 if project/role not found
     */
    @PutMapping("/v1/project/{projectId}/users/{userAuth0Id}/role/{newRoleId}")
    public ResponseEntity<Void> changeUserRole(
            @PathVariable UUID projectId,
            @PathVariable String userAuth0Id,
            @PathVariable UUID newRoleId) {

        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to change user {} role to {} in project {} for tenant: {}",
                userAuth0Id, newRoleId, projectId, tenantId);

        try {
            projectService.changeUserRole(projectId, userAuth0Id, newRoleId);
            return new ResponseEntity<>(HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            log.warn("Change user role failed: {}", e.getMessage());
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * Get a user's role in a project.
     *
     * @param projectId   The project ID
     * @param userAuth0Id The user's Auth0 ID
     * @return The user's role or 400 if user not in project
     */
    @GetMapping("/v1/project/{projectId}/users/{userAuth0Id}/role")
    public ResponseEntity<RoleResponseDTO> getUserRoleInProject(
            @PathVariable UUID projectId,
            @PathVariable String userAuth0Id) {

        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get role for user {} in project {} for tenant: {}",
                userAuth0Id, projectId, tenantId);

        try {
            RoleResponseDTO role = projectService.getUserRoleInProject(projectId, userAuth0Id);
            return new ResponseEntity<>(role, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            log.warn("Get user role failed: {}", e.getMessage());
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    // ===== STATISTICS AND COUNTS =====

    /**
     * Get project statistics.
     *
     * @return Project statistics including total, active, completed projects and total members
     */
    @GetMapping("/v1/projects/statistics")
    public ResponseEntity<ProjectStatsResponse> getProjectStatistics() {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get project statistics for tenant: {}", tenantId);

        ProjectStatsResponse stats = projectService.getProjectStatistics();
        return new ResponseEntity<>(stats, HttpStatus.OK);
    }

    /**
     * Count projects by status.
     *
     * @param status The project status
     * @return Count of projects with the specified status
     */
    @GetMapping("/v1/projects/count/status/{status}")
    public ResponseEntity<Long> countProjectsByStatus(@PathVariable ProjectStatus status) {
        String tenantId = datasourceContext.getTenantId();
        log.debug("Counting projects by status: {} for tenant: {}", status, tenantId);

        long count = projectService.countProjectsByStatus(status);
        return new ResponseEntity<>(count, HttpStatus.OK);
    }

    /**
     * Count users in a project.
     *
     * @param projectId The project ID
     * @return Count of users in the project or 404 if project not found
     */
    @GetMapping("/v1/project/{projectId}/users/count")
    public ResponseEntity<Long> countUsersInProject(@PathVariable UUID projectId) {
        String tenantId = datasourceContext.getTenantId();
        log.debug("Counting users in project {} for tenant: {}", projectId, tenantId);

        try {
            long count = projectService.countUsersInProject(projectId);
            return new ResponseEntity<>(count, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            log.warn("Count users in project failed: {}", e.getMessage());
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PostMapping("/v1/project/{projectId}/role")
    public ResponseEntity<RoleResponseDTO> createNewRoleInProject(
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateProjectRoleRequest request
    ) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to create a new role '{}' in project {} for tenant: {}",
                request.getName(), projectId, tenantId);

        try {
            RoleResponseDTO role = projectService.addRoleToProject(projectId, request);
            log.info("Successfully created role '{}' in project {} for tenant: {}",
                    role.getName(), projectId, tenantId);
            return ResponseEntity.status(HttpStatus.CREATED).body(role);
        } catch (IllegalArgumentException e) {
            log.warn("Failed to add role in project {}: {}", projectId, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Unexpected error while creating role in project {}: {}", projectId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/v1/project/{projectId}/role/{roleID}")
    public ResponseEntity<Void> deleteRoleFromProject(@PathVariable UUID projectId, @PathVariable UUID roleID) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to delete role {} from project {} for tenant: {}", roleID, projectId, tenantId);

        try {
            projectService.deleteRoleFromProject(projectId, roleID);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            log.warn("Role deletion failed: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            log.warn("Role deletion failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
    }

    @DeleteMapping("/v1/project/{projectId}/role/{oldRoleId}/move/{newRoleId}")
    public ResponseEntity<String> moveUsersAndDeleteRole(
            @PathVariable UUID projectId,
            @PathVariable UUID oldRoleId,
            @PathVariable UUID newRoleId) {

        log.info("Received request to delete role {} and move users to role {} for project {}",
                oldRoleId, newRoleId, projectId);

        try {
            String result = projectService.moveUsersAndDeleteRole(projectId, oldRoleId, newRoleId);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            log.warn("Role move/delete failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/v1/project/role/permissions")
    public ResponseEntity<RoleResponseDTO> updateRolePermissions(@RequestBody UpdateRolePermissionsRequest request) {
        log.info("Updating permissions for role {}", request.getId());
        try {
            RoleResponseDTO response = projectService.updateRoleAndPermissions(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("Role permission update failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/v1/project/role/{roleId}")
    public ResponseEntity<RoleResponseDTO> getRoleById(@PathVariable UUID roleId) {
        log.info("Fetching role details for roleId {}", roleId);

        try {
            RoleResponseDTO response = projectService.getRoleWithPermissions(roleId);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("Role fetch failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

}