package ai.kolate.project_manager.controller;

import ai.kolate.project_manager.dto.CreateProjectRequest;
import ai.kolate.project_manager.dto.GlobalResponse;
import ai.kolate.project_manager.dto.PagedResponse;
import ai.kolate.project_manager.dto.ProjectResponse;
import ai.kolate.project_manager.dto.ProjectStatsResponse;
import ai.kolate.project_manager.dto.ProjectSummaryResponse;
import ai.kolate.project_manager.dto.ProjectUserRequest;
import ai.kolate.project_manager.dto.ProjectUserResponse;
import ai.kolate.project_manager.dto.RoleDTO;
import ai.kolate.project_manager.dto.RoleResponseDTO;
import ai.kolate.project_manager.dto.UpdateProjectRequest;
import ai.kolate.project_manager.dto.UserProjectRoleDTO;
import ai.kolate.project_manager.dto.*;
import ai.kolate.project_manager.model.enums.RequestStatus;
import ai.kolate.project_manager.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;


@RestController
@RequestMapping("/api/project-manager")
@RequiredArgsConstructor
@Slf4j
public class ProjectController {
    
    private final ProjectService projectService;
    
    /**
     * Create a new project
     */
    @PostMapping("/v1/project")
    public ResponseEntity<GlobalResponse> createProject(@Valid @RequestBody CreateProjectRequest request,
                                                        @RequestHeader("org-id") String orgId,
                                                        @RequestHeader("user-id") String createdByAuth0Id) {
        try {
            log.info("Creating new project with name: {}", request.getName());
            ProjectResponse projectResponse = projectService.createProject(request, orgId, createdByAuth0Id);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("CREATED")
                    .message("Project created successfully")
                    .data(projectResponse)
                    .build();

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Failed to create project: {}", e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to create project: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Update an existing project
     */
    @PutMapping("/v1/project/{projectId}")
    public ResponseEntity<GlobalResponse> updateProject(
            @PathVariable UUID projectId,
            @Valid @RequestBody UpdateProjectRequest request) {
        try {
            log.info("Updating project with ID: {}", projectId);
            ProjectResponse projectResponse = projectService.updateProject(projectId, request);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("UPDATED")
                    .message("Project updated successfully")
                    .data(projectResponse)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to update project {}: {}", projectId, e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to update project: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get project by ID
     */
    @GetMapping("/v1/project/{projectId}")
    public ResponseEntity<GlobalResponse> getProjectById(@PathVariable UUID projectId) {
        try {
            log.info("Retrieving project with ID: {}", projectId);
            ProjectResponse projectResponse = projectService.getProjectById(projectId);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("SUCCESS")
                    .message("Project retrieved successfully")
                    .data(projectResponse)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to retrieve project {}: {}", projectId, e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to retrieve project: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Delete a project
     */
    @DeleteMapping("/v1/project/{projectId}")
    public ResponseEntity<GlobalResponse> deleteProject(@PathVariable UUID projectId) {
        try {
            log.info("Deleting project with ID: {}", projectId);
            projectService.deleteProject(projectId);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("DELETED")
                    .message("Project deleted successfully")
                    .data(null)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to delete project {}: {}", projectId, e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to delete project: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get all projects with pagination
     */
    @GetMapping("/v1/project")
    public ResponseEntity<GlobalResponse> getAllProjects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(name = "sort_by", defaultValue = "createdAt") String sortBy,
            @RequestParam(name = "sort_direction", defaultValue = "desc") String sortDirection) {
        try {
            log.info("Retrieving all projects - page: {}, size: {}", page, size);
            PagedResponse<ProjectSummaryResponse> pagedResponse = projectService.getAllProjects(page, size, sortBy, sortDirection);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("SUCCESS")
                    .message("Projects retrieved successfully")
                    .data(pagedResponse)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to retrieve all projects: {}", e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to retrieve projects: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Search projects by name pattern
     */
    @GetMapping("/v1/project/search")
    public ResponseEntity<GlobalResponse> searchProjectsByName(
            @RequestParam(name = "name_pattern", defaultValue = "") String namePattern,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(name = "sort_by", defaultValue = "createdAt") String sortBy,
            @RequestParam(name = "sort_direction", defaultValue = "desc") String sortDirection) {
        try {
            log.info("Searching projects by name pattern: {}", namePattern);

            if(StringUtils.isBlank(namePattern)) {
                log.info("Retrieving all projects - page: {}, size: {}", page, size);
                PagedResponse<ProjectSummaryResponse> pagedResponse = projectService.getAllProjects(page, size, sortBy, sortDirection);

                GlobalResponse response = GlobalResponse.builder()
                        .state(RequestStatus.SUCCESS)
                        .status("SUCCESS")
                        .message("Projects retrieved successfully")
                        .data(pagedResponse)
                        .build();

                return ResponseEntity.ok(response);
            }

            PagedResponse<ProjectSummaryResponse> pagedResponse = projectService.searchProjectsByName(namePattern, page, size, sortBy, sortDirection);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("SUCCESS")
                    .message("Projects found successfully")
                    .data(pagedResponse)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to search projects by name {}: {}", namePattern, e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to search projects: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get projects by user
     */
    @GetMapping("/v1/project/user/{userAuth0Id}")
    public ResponseEntity<GlobalResponse> getProjectsByUser(@PathVariable String userAuth0Id) {
        try {
            log.info("Retrieving projects for user: {}", userAuth0Id);
            List<ProjectSummaryResponse> projects = projectService.getProjectsByUser(userAuth0Id);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("SUCCESS")
                    .message("User projects retrieved successfully")
                    .data(projects)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to retrieve projects for user {}: {}", userAuth0Id, e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to retrieve user projects: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get projects by user with role and permissions
     */
    @GetMapping("/v1/project/user/{userAuth0Id}/roles-permissions")
    public ResponseEntity<GlobalResponse> getUserProjectsWithRolesAndPermissions(
            @PathVariable String userAuth0Id) {

        log.info("Received request to fetch projects, roles, and permissions for user: {}", userAuth0Id);

        try {
            List<UserProjectRoleWithPermissionsDTO> roles =
                    projectService.getUserProjectsWithRolesAndPermissions(userAuth0Id);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("SUCCESS")
                    .message("User projects with roles and permissions retrieved successfully")
                    .data(roles)
                    .build();

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error retrieving project roles for user {}: {}", userAuth0Id, e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to retrieve user projects with roles and permissions: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Add user to project
     */
    @PostMapping("/v1/project/{projectId}/users")
    public ResponseEntity<GlobalResponse> addUserToProject(
            @PathVariable UUID projectId,
            @Valid @RequestBody ProjectUserRequest request,
            @RequestHeader("org-id") String orgId,
            @RequestHeader("user-id") String updatedBy) {
        try {
            log.info("Adding user {} to project {}", request.getUserAuth0Id(), projectId);
            projectService.addUserToProject(projectId, request, orgId, updatedBy);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("ADDED")
                    .message("User added to project successfully")
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Failed to add user {} to project {}: {}", request.getUserAuth0Id(), projectId, e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to add user to project: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Remove user from project
     */
    @DeleteMapping("/v1/project/{projectId}/users/{userAuth0Id}")
    public ResponseEntity<GlobalResponse> removeUserFromProject(
            @PathVariable UUID projectId,
            @PathVariable String userAuth0Id) {
        try {
            log.info("Removing user {} from project {}", userAuth0Id, projectId);
            projectService.removeUserFromProject(projectId, userAuth0Id);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("REMOVED")
                    .message("User removed from project successfully")
                    .data(null)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to remove user {} from project {}: {}", userAuth0Id, projectId, e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to remove user from project: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get user projects and roles
     */
    @GetMapping("/v1/projects/user/{userAuth0Id}")
    public ResponseEntity<GlobalResponse> getUserProjectsAndRoles(@PathVariable String userAuth0Id) {
        try {
            log.info("Retrieving projects and roles for user: {}", userAuth0Id);
            List<UserProjectRoleDTO> userProjects = projectService.getUserProjectsAndRoles(userAuth0Id);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("SUCCESS")
                    .message("User projects and roles retrieved successfully")
                    .data(userProjects)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to retrieve projects and roles for user {}: {}", userAuth0Id, e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to retrieve user projects and roles: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get all project Roles
     */
    @GetMapping("/v1/project/{projectId}/roles")
    public ResponseEntity<GlobalResponse> getAllProjectRoles(@PathVariable UUID projectId) {
        try {
            log.info("Retrieving all roles for project: {}", projectId);
            List<RoleDTO> allProjectRoles = projectService.getAllProjectRoles(projectId);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("SUCCESS")
                    .message("Project roles retrieved successfully")
                    .data(allProjectRoles)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to retrieve roles for project {}: {}", projectId, e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to retrieve project roles: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Update user role in project
     */
    @PutMapping("/v1/project/{projectId}/users/{userAuth0Id}/role")
    public ResponseEntity<GlobalResponse> updateUserRoleInProject(
            @PathVariable UUID projectId,
            @PathVariable String userAuth0Id,
            @RequestHeader("user-id") String updatedBy,
            @RequestParam(name = "role") UUID newRole,
            @RequestHeader("org-id") String orgId) {
        try {
            log.info("Updating role for user {} in project {} to {}", userAuth0Id, projectId, newRole);
            projectService.updateUserRoleInProject(projectId, userAuth0Id, newRole, updatedBy, orgId);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("UPDATED")
                    .message("User role updated successfully")
                    .data(null)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to update role for user {} in project {}: {}", userAuth0Id, projectId, e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to update user role: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get all users in a project
     */
    @GetMapping("/v1/project/{projectId}/users")
    public ResponseEntity<GlobalResponse> getProjectUsers(@PathVariable UUID projectId) {
        try {
            log.info("Retrieving all users for project: {}", projectId);
            List<ProjectUserResponse> users = projectService.getProjectUsers(projectId);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("SUCCESS")
                    .message("Project users retrieved successfully")
                    .data(users)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to retrieve users for project {}: {}", projectId, e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to retrieve project users: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get users in a project by role
     */
//    @GetMapping("/v1/project/{projectId}/users/role/{role}")
//    public ResponseEntity<GlobalResponse> getProjectUsersByRole(
//            @PathVariable UUID projectId,
//            @PathVariable ProjectRole role) {
//        try {
//            log.info("Retrieving users with role {} for project: {}", role, projectId);
//            List<ProjectUserResponse> users = projectService.getProjectUsersByRole(projectId, role);
//
//            GlobalResponse response = GlobalResponse.builder()
//                    .state(RequestStatus.SUCCESS)
//                    .status("SUCCESS")
//                    .message("Project users by role retrieved successfully")
//                    .data(users)
//                    .build();
//
//            return ResponseEntity.ok(response);
//        } catch (Exception e) {
//            log.error("Failed to retrieve users with role {} for project {}: {}", role, projectId, e.getMessage());
//            GlobalResponse response = GlobalResponse.builder()
//                    .state(RequestStatus.FAILED)
//                    .status("ERROR")
//                    .message("Failed to retrieve project users by role: " + e.getMessage())
//                    .data(null)
//                    .build();
//
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
//        }
//    }

    /**
     * Get user role in project
     */
    @GetMapping("/v1/project/{projectId}/users/{userAuth0Id}/role")
    public ResponseEntity<GlobalResponse> getUserRoleInProject(
            @PathVariable UUID projectId,
            @PathVariable String userAuth0Id) {
        try {
            log.info("Retrieving role for user {} in project {}", userAuth0Id, projectId);
            RoleResponseDTO role = projectService.getUserRoleInProject(projectId, userAuth0Id);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("SUCCESS")
                    .message("User role retrieved successfully")
                    .data(role)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to retrieve role for user {} in project {}: {}", userAuth0Id, projectId, e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to retrieve user role: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Check if user exists in project
     */
    @GetMapping("/v1/project/{projectId}/users/{userAuth0Id}/exists")
    public ResponseEntity<GlobalResponse> isUserInProject(
            @PathVariable UUID projectId,
            @PathVariable String userAuth0Id) {
        try {
            log.info("Checking if user {} exists in project {}", userAuth0Id, projectId);
            Boolean exists = projectService.isUserInProject(projectId, userAuth0Id);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("SUCCESS")
                    .message("User existence check completed successfully")
                    .data(exists)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to check if user {} exists in project {}: {}", userAuth0Id, projectId, e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to check user existence: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/v1/projects/statistics")
    public ResponseEntity<GlobalResponse> getEnterpriseProjectStats() {
        try {
            log.info("Fetching enterprise project statistics");
            ProjectStatsResponse enterpriseProjectStats = projectService.getEnterpriseProjectStats();
                GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("SUCCESS")
                    .message("Fetched enterprise stats successfully")
                    .data(enterpriseProjectStats).build();
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Failed to fetch enterprise project stats : {}", e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to fetch enterprise project stats : " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Create a new role in a project
     */
    @PostMapping("/v1/project/{projectId}/role")
    public ResponseEntity<GlobalResponse> createNewRoleInProject(
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateProjectRoleRequest request) {
        log.info("Received request to create a new role '{}' in project {}", request.getName(), projectId);
        try {
            RoleResponseDTO role = projectService.addRoleToProject(projectId, request);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("SUCCESS")
                    .message("Fetched enterprise stats successfully")
    
   
                    .message("Role created successfully")
                    .data(role)
                    .build();

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        }  catch (Exception e) {
            log.error("Unexpected error while creating role in project {}: {}", projectId, e.getMessage(), e);
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to create role: " + e.getMessage())
                    .data(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Delete a role from a project
     */
    @DeleteMapping("/v1/project/{projectId}/role/{roleId}")
    public ResponseEntity<GlobalResponse> deleteRoleFromProject(
            @PathVariable UUID projectId,
            @PathVariable UUID roleId) {
        log.info("Received request to delete role {} from project {}", roleId, projectId);
        try {
            projectService.deleteRoleFromProject(projectId, roleId);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("SUCCESS")
                    .message("Role deleted successfully")
                    .data(null)
                    .build();

            return ResponseEntity.noContent().build();
        } catch (IllegalStateException e) {
            log.warn("Role deletion conflict for project {}: {}", projectId, e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("FAILED")
                    .message("Role cannot be deleted: " + e.getMessage())
                    .data(null)
                    .build();
            return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
        } catch (Exception e) {
            log.error("Unexpected error deleting role {} from project {}: {}", roleId, projectId, e.getMessage(), e);
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to delete role: " + e.getMessage())
                    .data(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Move users to a new role and delete the old role
     */
    @DeleteMapping("/v1/project/{projectId}/role/{oldRoleId}/move/{newRoleId}")
    public ResponseEntity<GlobalResponse> moveUsersAndDeleteRole(
            @PathVariable UUID projectId,
            @PathVariable UUID oldRoleId,
            @PathVariable UUID newRoleId) {
        log.info("Received request to move users from role {} to {} in project {}", oldRoleId, newRoleId, projectId);
        try {
            String result = projectService.moveUsersAndDeleteRole(projectId, oldRoleId, newRoleId);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("SUCCESS")
                    .message("Users moved and old role deleted successfully")
                    .data(result)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Unexpected error moving users from role {} to {} in project {}: {}", oldRoleId, newRoleId, projectId, e.getMessage(), e);
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to move users and delete role: " + e.getMessage())
                    .data(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Update role permissions
     */
    @PutMapping("/v1/project/role/permissions")
    public ResponseEntity<GlobalResponse> updateRolePermissions(
            @Valid @RequestBody UpdateRolePermissionsRequest request) {
        log.info("Updating permissions for role {}", request.getId());
        try {
            RoleResponseDTO updatedRole = projectService.updateRolePermissions(request);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("SUCCESS")
                    .message("Permissions updated successfully")
                    .data(updatedRole)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Unexpected error updating permissions for role {}: {}", request.getId(), e.getMessage(), e);
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to update permissions: " + e.getMessage())
                    .data(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/v1/project/role/{roleId}")
    public ResponseEntity<GlobalResponse> getRoleByIdWithPermissions(@PathVariable UUID roleId) {
        try {
            log.info("Fetching role with permission");
            RoleResponseDTO role = projectService.getRoleByIdWithPermissions(roleId);
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("SUCCESS")
                    .message("Fetched role with permission successfully")
                    .data(role).build();
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Failed to fetch role with permission : {}", e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to fetch role with permission : " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

}

