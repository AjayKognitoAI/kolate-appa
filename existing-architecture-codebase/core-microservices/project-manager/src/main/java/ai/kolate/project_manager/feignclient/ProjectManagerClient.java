package ai.kolate.project_manager.feignclient;

import ai.kolate.project_manager.config.FeignClientConfig;
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
import jakarta.validation.Valid;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "${feign.clients.postgres-database-manager.name}",
        path = "${feign.clients.postgres-database-manager.path}",
        configuration = FeignClientConfig.class)
public interface ProjectManagerClient {

    @PostMapping("/v1/project")
    ProjectResponse createProject(@Valid @RequestBody CreateProjectRequest request);

    @PutMapping("/v1/project/{projectId}")
    ProjectResponse updateProject(
            @PathVariable UUID projectId,
            @Valid @RequestBody UpdateProjectRequest request);

    @GetMapping("/v1/project/{projectId}")
    ProjectResponse getProjectById(@PathVariable UUID projectId);

    @DeleteMapping("/v1/project/{projectId}")
    public ResponseEntity<Void> deleteProject(@PathVariable UUID projectId);

    @GetMapping("/v1/projects")
    PagedResponse<ProjectSummaryResponse> getAllProjects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection);

    @GetMapping("/v1/projects/search")
    PagedResponse<ProjectSummaryResponse> searchProjectsByName(
            @RequestParam String namePattern,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection);

    @GetMapping("/v1/projects/user/{userAuth0Id}")
    List<ProjectSummaryResponse> getProjectsByUser(@PathVariable String userAuth0Id);

    @PostMapping("/v1/project/{projectId}/users")
    ResponseEntity<Void> addUserToProject(
            @PathVariable UUID projectId,
            @Valid @RequestBody ProjectUserRequest request);

    @DeleteMapping("/v1/project/{projectId}/users/{userAuth0Id}")
    ResponseEntity<Void> removeUserFromProject(
            @PathVariable UUID projectId,
            @PathVariable String userAuth0Id);

    @GetMapping("/v1/projects/user/{userAuth0Id}/projects-with-roles")
    List<UserProjectRoleDTO> getUserProjectsAndRoles(
            @PathVariable String userAuth0Id);

    @GetMapping("/v1/project/{projectId}/roles")
    List<RoleDTO> getProjectRoles(@PathVariable UUID projectId);

    @PutMapping("/v1/project/{projectId}/users/{userAuth0Id}/role/{newRoleId}")
    ResponseEntity<Void> updateUserRoleInProject(
            @PathVariable UUID projectId,
            @PathVariable String userAuth0Id,
            @PathVariable UUID newRoleId);

    @GetMapping("/v1/project/{projectId}/users")
    List<ProjectUserResponse> getProjectUsers(@PathVariable UUID projectId);

//    @GetMapping("/v1/project/{projectId}/users/role/{role}")
//    List<ProjectUserResponse> getProjectUsersByRole(
//            @PathVariable UUID projectId,
//            @PathVariable ProjectRole role);

    @GetMapping("/v1/project/{projectId}/users/{userAuth0Id}/role")
    public ResponseEntity<RoleResponseDTO> getUserRoleInProject(
            @PathVariable UUID projectId,
            @PathVariable String userAuth0Id);

    @GetMapping("/v1/project/{projectId}/users/{userAuth0Id}/exists")
    Boolean isUserInProject(
            @PathVariable UUID projectId,
            @PathVariable String userAuth0Id);

    @GetMapping("/v1/projects/statistics")
    ProjectStatsResponse getProjectStatistics();
    @PostMapping("/v1/project/{projectId}/role")
    RoleResponseDTO createNewRoleInProject(@PathVariable UUID projectId,
                                           @RequestBody CreateProjectRoleRequest request);

    @DeleteMapping("/v1/project/{projectId}/role/{roleId}")
    void deleteRoleFromProject(@PathVariable UUID projectId,
                               @PathVariable UUID roleId);

    @DeleteMapping("/v1/project/{projectId}/role/{oldRoleId}/move/{newRoleId}")
    String moveUsersAndDeleteRole(@PathVariable UUID projectId,
                                  @PathVariable UUID oldRoleId,
                                  @PathVariable UUID newRoleId);

    @PutMapping("/v1/project/role/permissions")
    RoleResponseDTO updateRolePermissions(@RequestBody UpdateRolePermissionsRequest request);

    @GetMapping("/v1/projects/user/{userAuth0Id}/roles-permissions")
    List<UserProjectRoleWithPermissionsDTO> getUserProjectsWithRolesAndPermissions(
            @PathVariable("userAuth0Id") String userAuth0Id
    );

    @GetMapping("/v1/project/role/{roleId}")
    RoleResponseDTO getRoleByIdWithPermissions(
            @PathVariable("roleId") UUID roleId
    );
}
