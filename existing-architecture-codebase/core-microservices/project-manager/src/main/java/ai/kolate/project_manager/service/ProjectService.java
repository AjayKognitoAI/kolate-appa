package ai.kolate.project_manager.service;

import ai.kolate.project_manager.dto.CreateProjectRequest;
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

import java.util.List;
import java.util.UUID;

public interface ProjectService {

    /**
     * Creates a new project
     *
     * @param request the project creation request
     * @return the created project response
     */
    ProjectResponse createProject(CreateProjectRequest request, String orgId, String createdByAuth0Id);

    /**
     * Updates an existing project
     *
     * @param projectId the project ID
     * @param request   the project update request
     * @return the updated project response
     */
    ProjectResponse updateProject(UUID projectId, UpdateProjectRequest request);

    /**
     * Retrieves a project by its ID
     *
     * @param projectId the project ID
     * @return the project response
     */
    ProjectResponse getProjectById(UUID projectId);

    /**
     * Deletes a project by its ID
     *
     * @param projectId the project ID
     */
    void deleteProject(UUID projectId);

    /**
     * Retrieves all projects with pagination and sorting
     *
     * @param page          the page number (0-based)
     * @param size          the page size
     * @param sortBy        the field to sort by
     * @param sortDirection the sort direction (ASC/DESC)
     * @return paginated project summary response
     */
    PagedResponse<ProjectSummaryResponse> getAllProjects(int page, int size, String sortBy, String sortDirection);

    /**
     * Searches projects by name pattern with pagination and sorting
     *
     * @param namePattern   the name pattern to search for
     * @param page          the page number (0-based)
     * @param size          the page size
     * @param sortBy        the field to sort by
     * @param sortDirection the sort direction (ASC/DESC)
     * @return paginated project summary response
     */
    PagedResponse<ProjectSummaryResponse> searchProjectsByName(String namePattern, int page, int size, String sortBy, String sortDirection);

    /**
     * Retrieves all projects for a specific user
     *
     * @param userAuth0Id the user's Auth0 ID
     * @return list of project summary responses
     */
    List<ProjectSummaryResponse> getProjectsByUser(String userAuth0Id);

    /**
     * Adds a user to a project
     *
     * @param projectId the project ID
     * @param request   the project user request
     */
    void addUserToProject(UUID projectId, ProjectUserRequest request, String orgId, String updatedBy);

    /**
     * Removes a user from a project
     *
     * @param projectId   the project ID
     * @param userAuth0Id the user's Auth0 ID
     */
    void removeUserFromProject(UUID projectId, String userAuth0Id);

    List<UserProjectRoleDTO> getUserProjectsAndRoles(String userAuth0Id);

    List<RoleDTO> getAllProjectRoles(UUID projectId);

    /**
     * Updates a user's role in a project
     *
     * @param projectId   the project ID
     * @param userAuth0Id the user's Auth0 ID
     * @param newRole     the new role for the user
     */
    void updateUserRoleInProject(UUID projectId, String userAuth0Id, UUID newRole, String updatedBy, String orgId);

    /**
     * Retrieves all users in a project
     *
     * @param projectId the project ID
     * @return list of project user responses
     */
    List<ProjectUserResponse> getProjectUsers(UUID projectId);

    /**
     * Retrieves all users in a project with a specific role
     *
     * @param projectId the project ID
     * @param role      the role to filter by
     * @return list of project user responses
     */
//    List<ProjectUserResponse> getProjectUsersByRole(UUID projectId, ProjectRole role);

    /**
     * Retrieves a user's role in a project
     *
     * @param projectId   the project ID
     * @param userAuth0Id the user's Auth0 ID
     * @return the user's role in the project
     */
    RoleResponseDTO getUserRoleInProject(UUID projectId, String userAuth0Id);

    /**
     * Checks if a user exists in a project
     *
     * @param projectId   the project ID
     * @param userAuth0Id the user's Auth0 ID
     * @return true if the user exists in the project, false otherwise
     */
    Boolean isUserInProject(UUID projectId, String userAuth0Id);

    ProjectStatsResponse getEnterpriseProjectStats();

    RoleResponseDTO addRoleToProject(UUID projectId, CreateProjectRoleRequest request);

    void deleteRoleFromProject(UUID projectId, UUID roleId);

    String moveUsersAndDeleteRole(UUID projectId, UUID oldRoleId, UUID newRoleId);

    RoleResponseDTO updateRolePermissions(UpdateRolePermissionsRequest request);

    List<UserProjectRoleWithPermissionsDTO> getUserProjectsWithRolesAndPermissions(String userAuth0Id);

    RoleResponseDTO getRoleByIdWithPermissions(UUID roleId);
}
