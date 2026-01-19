package ai.kolate.postgres_database_manager.service;

import ai.kolate.postgres_database_manager.dto.PagedResponse;
import ai.kolate.postgres_database_manager.dto.project.*;
import ai.kolate.postgres_database_manager.model.Role;
import ai.kolate.postgres_database_manager.model.enums.ProjectStatus;
import org.springframework.data.domain.Pageable;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface ProjectService {
    /**
     * Create a new project with initial users
     */
    ProjectResponse createProject(CreateProjectRequest request);

    /**
     * Update an existing project
     */
    ProjectResponse updateProject(UUID projectId, UpdateProjectRequest request);

    /**
     * Get project by ID
     */
    ProjectResponse getProjectById(UUID projectId);

    /**
     * Get project summary by ID (less detailed)
     */
    ProjectSummaryResponse getProjectSummaryById(UUID projectId);

    /**
     * Delete a project (and all associated users)
     */
    void deleteProject(UUID projectId);

    /**
     * Get all projects with pagination
     */
    PagedResponse<ProjectSummaryResponse> getAllProjects(Pageable pageable);

    /**
     * Get projects by status with pagination
     */
    PagedResponse<ProjectSummaryResponse> getProjectsByStatus(ProjectStatus status, Pageable pageable);

    /**
     * Search projects by name pattern with pagination
     */
    PagedResponse<ProjectSummaryResponse> searchProjectsByName(String namePattern, Pageable pageable);

    /**
     * Get projects created by a specific user
     */
    PagedResponse<ProjectSummaryResponse> getProjectsByCreatedBy(String createdBy, Pageable pageable);

    /**
     * Get projects within date range
     */
    List<ProjectSummaryResponse> getProjectsCreatedBetween(OffsetDateTime startDate, OffsetDateTime endDate);

    /**
     * Get projects that a user is associated with
     */
    List<ProjectSummaryResponse> getProjectsByUser(String userAuth0Id);

    List<UserProjectRoleWithPermissionsDTO> getUserProjectsWithRolesAndPermissions(String userAuth0Id);

    // Project User Management

    /**
     * Add user to project
     */
    void addUserToProject(UUID projectId, ProjectUserRequest request);

    /**
     * Remove user from project
     */
    void removeUserFromProject(UUID projectId, String userAuth0Id);

    /**
     * Get all users in a project
     */
    List<ProjectUserResponse> getProjectUsers(UUID projectId);

    /**
     * Check if user is in project
     */
    boolean isUserInProject(UUID projectId, String userAuth0Id);

    // Role Management - NEW METHODS

    /**
     * Get all roles for a specific project
     */
    List<RoleDTO> getProjectRoles(UUID projectId);

    /**
     * Get roles with permissions for a specific project
     */
    List<Role> getProjectRolesWithPermissions(UUID projectId);

    /**
     * Attach/Assign a role to a user in a project
     */
    void attachRoleToUser(UUID projectId, String userAuth0Id, UUID roleId);

    /**
     * Change user's role in a project
     */
    void changeUserRole(UUID projectId, String userAuth0Id, UUID newRoleId);

    /**
     * Get user's role in a project
     */
    RoleResponseDTO getUserRoleInProject(UUID projectId, String userAuth0Id);

    // Statistics and Counts

    /**
     * Get project statistics
     */
    ProjectStatsResponse getProjectStatistics();

    /**
     * Count projects by status
     */
    long countProjectsByStatus(ProjectStatus status);

    /**
     * Count users in project
     */
    long countUsersInProject(UUID projectId);

    /**
     * Add role to project
     */
    RoleResponseDTO addRoleToProject(UUID projectId, CreateProjectRoleRequest request);

    void deleteRoleFromProject(UUID projectId, UUID roleId);

    String moveUsersAndDeleteRole(UUID projectId, UUID oldRoleId, UUID newRoleId);

    RoleResponseDTO updateRoleAndPermissions(UpdateRolePermissionsRequest request);

    RoleResponseDTO getRoleWithPermissions(UUID roleId);
}
