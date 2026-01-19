package ai.kolate.project_manager.service.impl;

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
import ai.kolate.project_manager.dto.kafka.KafkaTopics;
import ai.kolate.project_manager.dto.kafka.ProjectInviteNotificationDTO;
import ai.kolate.project_manager.dto.kafka.RoleAssignedNotificationDTO;
import ai.kolate.project_manager.exception.FeignClientException;
import ai.kolate.project_manager.exception.ProjectNotFoundException;
import ai.kolate.project_manager.exception.UserNotFoundInProjectException;
import ai.kolate.project_manager.feignclient.ProjectManagerClient;
import ai.kolate.project_manager.service.MessagePublisherService;
import ai.kolate.project_manager.service.ProjectService;
import feign.FeignException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
public class ProjectServiceImpl implements ProjectService {

    private static final Logger logger = LoggerFactory.getLogger(ProjectServiceImpl.class);

    private final ProjectManagerClient projectManagerClient;
    private final MessagePublisherService messagePublisherService;

    public ProjectServiceImpl(ProjectManagerClient projectManagerClient,
                              MessagePublisherService messagePublisherService) {
        this.projectManagerClient = projectManagerClient;
        this.messagePublisherService = messagePublisherService;
    }

    @Override
    public ProjectResponse createProject(CreateProjectRequest request, String orgId, String createdByAuth0Id) {
        try {
            logger.debug("Creating new project with name: {}", request.getName());
            ProjectResponse response = projectManagerClient.createProject(request);
            logger.info("Successfully created project with ID: {}", response.getId());

            ProjectInviteNotificationDTO notificationDTO = ProjectInviteNotificationDTO.builder()
                    .type("PROJECT_INVITATION")
                    .projectUsers(request.getProjectUsers())
                    .projectId(response.getId().toString())
                    .projectName(response.getName())
                    .senderId(createdByAuth0Id)
                    .orgId(orgId)
                    .build();
            messagePublisherService.publishMessage(notificationDTO, KafkaTopics.TOPIC_NOTIFICATION_ALL);

            return response;
        } catch (FeignException e) {
            logger.error("Failed to create project: {}", e.contentUTF8());
            throw new FeignClientException(e.contentUTF8(), e.status(), e);
        }
    }

    @Override
    public ProjectResponse updateProject(UUID projectId, UpdateProjectRequest request) {
        try {
            logger.debug("Updating project with ID: {}", projectId);
            ProjectResponse response = projectManagerClient.updateProject(projectId, request);
            logger.info("Successfully updated project with ID: {}", projectId);
            return response;
        } catch (FeignException e) {
            if (e.status() == 404) {
                logger.error("Project not found with ID: {}", projectId);
                throw new ProjectNotFoundException("Project not found with ID: " + projectId);
            }
            logger.error("Failed to update project with ID {}: {}", projectId, e.getMessage());
            throw new FeignClientException("Failed to update project", e.status(), e);
        }
    }

    @Override
    public ProjectResponse getProjectById(UUID projectId) {
        try {
            logger.debug("Retrieving project with ID: {}", projectId);
            ProjectResponse response = projectManagerClient.getProjectById(projectId);
            logger.debug("Successfully retrieved project with ID: {}", projectId);
            return response;
        } catch (FeignException e) {
            if (e.status() == 404) {
                logger.error("Project not found with ID: {}", projectId);
                throw new ProjectNotFoundException("Project not found with ID: " + projectId);
            }
            logger.error("Failed to retrieve project with ID {}: {}", projectId, e.getMessage());
            throw new FeignClientException("Failed to retrieve project", e.status(), e);
        }
    }

    @Override
    public void deleteProject(UUID projectId) {
        try {
            logger.debug("Deleting project with ID: {}", projectId);
            ResponseEntity<Void> response = projectManagerClient.deleteProject(projectId);
            if (response.getStatusCode().is2xxSuccessful()) {
                logger.info("Successfully deleted project with ID: {}", projectId);
            }
        } catch (FeignException e) {
            if (e.status() == 404) {
                logger.error("Project not found with ID: {}", projectId);
                throw new ProjectNotFoundException("Project not found with ID: " + projectId);
            }
            logger.error("Failed to delete project with ID {}: {}", projectId, e.getMessage());
            throw new FeignClientException("Failed to delete project", e.status(), e);
        }
    }

    @Override
    public PagedResponse<ProjectSummaryResponse> getAllProjects(int page, int size, String sortBy, String sortDirection) {
        try {
            logger.debug("Retrieving all projects - page: {}, size: {}, sortBy: {}, sortDirection: {}", 
                        page, size, sortBy, sortDirection);
            PagedResponse<ProjectSummaryResponse> response = projectManagerClient.getAllProjects(page, size, sortBy, sortDirection);
            logger.debug("Successfully retrieved {} projects", response.getTotalElements());
            return response;
        } catch (FeignException e) {
            logger.error("Failed to retrieve all projects: {}", e.getMessage());
            throw new FeignClientException("Failed to retrieve all projects", e.status(), e);
        }
    }

    @Override
    public PagedResponse<ProjectSummaryResponse> searchProjectsByName(String namePattern, int page, int size, String sortBy, String sortDirection) {
        try {
            logger.debug("Searching projects by name pattern: {} - page: {}, size: {}, sortBy: {}, sortDirection: {}", 
                        namePattern, page, size, sortBy, sortDirection);
            PagedResponse<ProjectSummaryResponse> response = projectManagerClient.searchProjectsByName(namePattern, page, size, sortBy, sortDirection);
            logger.debug("Successfully found {} projects matching pattern: {}", response.getTotalElements(), namePattern);
            return response;
        } catch (FeignException e) {
            logger.error("Failed to search projects by name pattern {}: {}", namePattern, e.getMessage());
            throw new FeignClientException("Failed to search projects by name", e.status(), e);
        }
    }

    @Override
    public List<ProjectSummaryResponse> getProjectsByUser(String userAuth0Id) {
        try {
            logger.debug("Retrieving projects for user: {}", userAuth0Id);
            List<ProjectSummaryResponse> response = projectManagerClient.getProjectsByUser(userAuth0Id);
            logger.debug("Successfully retrieved {} projects for user: {}", response.size(), userAuth0Id);
            return response;
        } catch (FeignException e) {
            logger.error("Failed to retrieve projects for user {}: {}", userAuth0Id, e.getMessage());
            throw new FeignClientException("Failed to retrieve projects for user", e.status(), e);
        }
    }

    @Override
    public void addUserToProject(UUID projectId, ProjectUserRequest request, String orgId, String updatedBy) {
        try {
            logger.debug("Adding user {} to project {}", request.getUserAuth0Id(), projectId);
            ResponseEntity<Void> response = projectManagerClient.addUserToProject(projectId, request);
            if (response.getStatusCode().is2xxSuccessful()) {
                logger.info("Successfully added user {} to project {}", request.getUserAuth0Id(), projectId);

                ProjectResponse project = projectManagerClient.getProjectById(projectId);
                ProjectInviteNotificationDTO notificationDTO = ProjectInviteNotificationDTO.builder()
                        .type("PROJECT_INVITATION")
                        .orgId(orgId)
                        .projectUsers(List.of(request))
                        .projectId(projectId.toString())
                        .projectName(project.getName())
                        .senderId(updatedBy)
                        .build();
                messagePublisherService.publishMessage(notificationDTO, KafkaTopics.TOPIC_NOTIFICATION_ALL);
            }
        } catch (FeignException e) {
            if (e.status() == 404) {
                logger.error("Project not found with ID: {}", projectId);
                throw new ProjectNotFoundException("Project not found with ID: " + projectId);
            }
            logger.error("Failed to add user {} to project {}: {}", request.getUserAuth0Id(), projectId, e.getMessage());
            throw new FeignClientException("Failed to add user to project", e.status(), e);
        }
    }

    @Override
    public void removeUserFromProject(UUID projectId, String userAuth0Id) {
        try {
            logger.debug("Removing user {} from project {}", userAuth0Id, projectId);
            ResponseEntity<Void> response = projectManagerClient.removeUserFromProject(projectId, userAuth0Id);
            if (response.getStatusCode().is2xxSuccessful()) {
                logger.info("Successfully removed user {} from project {}", userAuth0Id, projectId);
            }
        } catch (FeignException e) {
            if (e.status() == 404) {
                logger.error("Project not found with ID: {} or user not found in project: {}", projectId, userAuth0Id);
                throw new UserNotFoundInProjectException("User not found in project with ID: " + projectId);
            }
            logger.error("Failed to remove user {} from project {}: {}", userAuth0Id, projectId, e.getMessage());
            throw new FeignClientException("Failed to remove user from project", e.status(), e);
        }
    }

    /**
     * @param userAuth0Id
     * @return
     */
    @Override
    public List<UserProjectRoleDTO> getUserProjectsAndRoles(String userAuth0Id) {
        try {
            logger.info("Getting all projects for user :: {}", userAuth0Id);
            return projectManagerClient.getUserProjectsAndRoles(userAuth0Id);
        } catch (FeignException e) {
            logger.error("Failed to retrieve projects for user :: {} with exception :: {}", userAuth0Id, e.getMessage());
            throw new FeignClientException("Failed to retrieve projects for user", e.status(), e);
        }
    }

    /**
     * @param projectId
     * @return
     */
    @Override
    public List<RoleDTO> getAllProjectRoles(UUID projectId) {
        try {
            logger.info("Getting all roles for project :: {}", projectId);
            return projectManagerClient.getProjectRoles(projectId);
        } catch (FeignException e) {
            logger.error("Failed to retrieve roles for project :: {} with exception :: {}", projectId, e.getMessage());
            throw new FeignClientException("Failed to retrieve roles for project", e.status(), e);
        }
    }

    @Override
    public void updateUserRoleInProject(UUID projectId, String userAuth0Id, UUID newRole, String updatedBy, String orgId) {
        try {
            logger.debug("Updating role for user {} in project {} to {}", userAuth0Id, projectId, newRole);
            ResponseEntity<Void> response = projectManagerClient.updateUserRoleInProject(projectId, userAuth0Id, newRole);
            if (response.getStatusCode().is2xxSuccessful()) {
                logger.info("Successfully updated role for user {} in project {} to {}", userAuth0Id, projectId, newRole);

                RoleResponseDTO roleResponse =  getUserRoleInProject(projectId, userAuth0Id);
                ProjectResponse projectResponse = getProjectById(projectId);

                RoleAssignedNotificationDTO notificationDTO = RoleAssignedNotificationDTO.builder()
                        .type("ROLE_ASSIGNED")
                        .orgId(orgId)
                        .roleName(roleResponse.getName())
                        .projectId(projectId)
                        .projectName(projectResponse.getName())
                        .senderId(updatedBy)
                        .recipientId(userAuth0Id)
                        .build();

                messagePublisherService.publishMessage(notificationDTO, KafkaTopics.TOPIC_NOTIFICATION_ALL);
            }
        } catch (FeignException e) {
            if (e.status() == 404) {
                logger.error("Project not found with ID: {} or user not found in project: {}", projectId, userAuth0Id);
                throw new UserNotFoundInProjectException("User not found in project with ID: " + projectId);
            }
            logger.error("Failed to update role for user {} in project {}: {}", userAuth0Id, projectId, e.getMessage());
            throw new FeignClientException("Failed to update user role in project", e.status(), e);
        }
    }

    @Override
    public List<ProjectUserResponse> getProjectUsers(UUID projectId) {
        try {
            logger.debug("Retrieving all users for project: {}", projectId);
            List<ProjectUserResponse> response = projectManagerClient.getProjectUsers(projectId);
            logger.debug("Successfully retrieved {} users for project: {}", response.size(), projectId);
            return response;
        } catch (FeignException e) {
            if (e.status() == 404) {
                logger.error("Project not found with ID: {}", projectId);
                throw new ProjectNotFoundException("Project not found with ID: " + projectId);
            }
            logger.error("Failed to retrieve users for project {}: {}", projectId, e.getMessage());
            throw new FeignClientException("Failed to retrieve project users", e.status(), e);
        }
    }

//    @Override
//    public List<ProjectUserResponse> getProjectUsersByRole(UUID projectId, ProjectRole role) {
//        try {
//            logger.debug("Retrieving users with role {} for project: {}", role, projectId);
//            List<ProjectUserResponse> response = projectManagerClient.getProjectUsersByRole(projectId, role);
//            logger.debug("Successfully retrieved {} users with role {} for project: {}", response.size(), role, projectId);
//            return response;
//        } catch (FeignException e) {
//            if (e.status() == 404) {
//                logger.error("Project not found with ID: {}", projectId);
//                throw new ProjectNotFoundException("Project not found with ID: " + projectId);
//            }
//            logger.error("Failed to retrieve users with role {} for project {}: {}", role, projectId, e.getMessage());
//            throw new FeignClientException("Failed to retrieve project users by role", e.status(), e);
//        }
//    }

    @Override
    public RoleResponseDTO getUserRoleInProject(UUID projectId, String userAuth0Id) {
        try {
            logger.debug("Retrieving role for user {} in project {}", userAuth0Id, projectId);
            ResponseEntity<RoleResponseDTO> response = projectManagerClient.getUserRoleInProject(projectId, userAuth0Id);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                RoleResponseDTO role = response.getBody();
                logger.debug("Successfully retrieved role {} for user {} in project {}", role, userAuth0Id, projectId);
                return role;
            } else {
                logger.error("No role found for user {} in project {}", userAuth0Id, projectId);
                throw new UserNotFoundInProjectException("User not found in project with ID: " + projectId);
            }
        } catch (FeignException e) {
            if (e.status() == 404) {
                logger.error("Project not found with ID: {} or user not found in project: {}", projectId, userAuth0Id);
                throw new UserNotFoundInProjectException("User not found in project with ID: " + projectId);
            }
            logger.error("Failed to retrieve role for user {} in project {}: {}", userAuth0Id, projectId, e.getMessage());
            throw new FeignClientException("Failed to retrieve user role in project", e.status(), e);
        }
    }

    @Override
    public Boolean isUserInProject(UUID projectId, String userAuth0Id) {
        try {
            logger.debug("Checking if user {} exists in project {}", userAuth0Id, projectId);
            Boolean response = projectManagerClient.isUserInProject(projectId, userAuth0Id);
            logger.debug("User {} {} in project {}", userAuth0Id, response ? "exists" : "does not exist", projectId);
            return response;
        } catch (FeignException e) {
            if (e.status() == 404) {
                logger.error("Project not found with ID: {}", projectId);
                throw new ProjectNotFoundException("Project not found with ID: " + projectId);
            }
            logger.error("Failed to check if user {} exists in project {}: {}", userAuth0Id, projectId, e.getMessage());
            throw new FeignClientException("Failed to check user existence in project", e.status(), e);
        }
    }

    /**
     * @return
     */
    @Override
    public ProjectStatsResponse getEnterpriseProjectStats() {
        try {
            ProjectStatsResponse projectStatistics = projectManagerClient.getProjectStatistics();
            logger.info("Successfully fetch enterprise project stats");
            return projectStatistics;
        } catch (FeignException e) {
            logger.error("Failed to fetch enterprise project stats: {}", e.getMessage());
            throw new FeignClientException("Failed to fetch enterprise project stats", e.status(), e);
        }
    }
    @Override
    public RoleResponseDTO addRoleToProject(UUID projectId, CreateProjectRoleRequest request) {
        try {
            logger.debug("Creating new role '{}' in project {}", request.getName(), projectId);
            RoleResponseDTO response = projectManagerClient.createNewRoleInProject(projectId, request);
            logger.debug("Successfully created role '{}' in project {}", response.getName(), projectId);
            return response;
        } catch (FeignException e) {
            if (e.status() == 404) {
                logger.error("Project not found with ID: {}", projectId);
                throw new ProjectNotFoundException("Project not found with ID: " + projectId);
            }
            logger.error("Failed to create role '{}' in project {}: {}", request.getName(), projectId, e.getMessage());
            throw new FeignClientException("Failed to create role in project", e.status(), e);
        }
    }

    @Override
    public void deleteRoleFromProject(UUID projectId, UUID roleId) {
        try {
            logger.debug("Deleting role {} from project {}", roleId, projectId);
            projectManagerClient.deleteRoleFromProject(projectId, roleId);
            logger.debug("Successfully deleted role {} from project {}", roleId, projectId);
        } catch (FeignException e) {
            if (e.status() == 404) {
                logger.error("Role not found with ID: {} in project {}", roleId, projectId);
                throw new IllegalArgumentException("Role not found in project with ID: " + projectId);
            }
            if (e.status() == 409) {
                logger.warn("Cannot delete role {} from project {} as it is in use", roleId, projectId);
                throw new IllegalStateException("Role cannot be deleted because it is in use");
            }
            logger.error("Failed to delete role {} from project {}: {}", roleId, projectId, e.getMessage());
            throw new FeignClientException("Failed to delete role from project", e.status(), e);
        }
    }

    @Override
    public String moveUsersAndDeleteRole(UUID projectId, UUID oldRoleId, UUID newRoleId) {
        try {
            logger.debug("Moving users from role {} to {} in project {}", oldRoleId, newRoleId, projectId);
            String response = projectManagerClient.moveUsersAndDeleteRole(projectId, oldRoleId, newRoleId);
            logger.debug("Successfully moved users and deleted role {} from project {}", oldRoleId, projectId);
            return response;
        } catch (FeignException e) {
            if (e.status() == 404) {
                logger.error("Old role {} or new role {} not found in project {}", oldRoleId, newRoleId, projectId);
                throw new IllegalArgumentException("Old role or new role not found for project with ID: " + projectId);
            }
            logger.error("Failed to move users from role {} to {} in project {}: {}", oldRoleId, newRoleId, projectId, e.getMessage());
            throw new FeignClientException("Failed to move users and delete role", e.status(), e);
        }
    }

    @Override
    public RoleResponseDTO updateRolePermissions(UpdateRolePermissionsRequest request) {
        try {
            logger.debug("Updating permissions for role {}", request.getId());
            RoleResponseDTO response = projectManagerClient.updateRolePermissions(request);
            logger.debug("Successfully updated permissions for role {}", request.getId());
            return response;
        } catch (FeignException e) {
            if (e.status() == 404) {
                logger.error("Role not found with ID: {}", request.getId());
                throw new IllegalArgumentException("Role not found with ID: " + request.getId());
            }
            logger.error("Failed to update permissions for role {}: {}", request.getId(), e.getMessage());
            throw new FeignClientException("Failed to update role permissions", e.status(), e);
        }
    }

    @Override
    public List<UserProjectRoleWithPermissionsDTO> getUserProjectsWithRolesAndPermissions(String userAuth0Id) {
        try {
            logger.debug("Fetching projects, roles, and permissions for user: {}", userAuth0Id);

            // ✅ Call the Feign client (ProjectManager service)
            List<UserProjectRoleWithPermissionsDTO> response =
                    projectManagerClient.getUserProjectsWithRolesAndPermissions(userAuth0Id);

            logger.debug("Successfully retrieved {} project-role records for user {}",
                    response.size(), userAuth0Id);
            return response;

        } catch (FeignException e) {
            if (e.status() == 404) {
                logger.error("No projects found for user: {}", userAuth0Id);
                return Collections.emptyList();  // or throw a UserNotFoundException if you prefer
            }
            logger.error("Failed to fetch project roles for user {}: {}", userAuth0Id, e.getMessage());
            throw new FeignClientException("Failed to retrieve user projects with roles and permissions",
                    e.status(), e);
        }
    }
    @Override
    public RoleResponseDTO getRoleByIdWithPermissions(UUID roleId) {
        try {
            RoleResponseDTO role = projectManagerClient.getRoleByIdWithPermissions(roleId);
            logger.info("Successfully fetch role with permissions");
            return role;
        } catch (FeignException e) {
            logger.error("Failed to fetch role with permissions: {}", e.getMessage());
            throw new FeignClientException("Failed to fetch role with permissions", e.status(), e);
        }
    }
}
