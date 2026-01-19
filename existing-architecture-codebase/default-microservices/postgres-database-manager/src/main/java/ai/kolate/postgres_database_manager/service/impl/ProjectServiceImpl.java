package ai.kolate.postgres_database_manager.service.impl;

import ai.kolate.postgres_database_manager.dto.PagedResponse;
import ai.kolate.postgres_database_manager.dto.project.*;
import ai.kolate.postgres_database_manager.model.Permission;
import ai.kolate.postgres_database_manager.model.Project;
import ai.kolate.postgres_database_manager.model.ProjectUser;
import ai.kolate.postgres_database_manager.model.ProjectUserId;
import ai.kolate.postgres_database_manager.model.Role;
import ai.kolate.postgres_database_manager.model.User;
import ai.kolate.postgres_database_manager.model.enums.AccessType;
import ai.kolate.postgres_database_manager.model.enums.ModuleType;
import ai.kolate.postgres_database_manager.model.enums.ProjectStatus;
import ai.kolate.postgres_database_manager.repository.DefaultRoleRepository;
import ai.kolate.postgres_database_manager.repository.PermissionRepository;
import ai.kolate.postgres_database_manager.repository.ProjectRepository;
import ai.kolate.postgres_database_manager.repository.ProjectUserRepository;
import ai.kolate.postgres_database_manager.repository.RoleRepository;
import ai.kolate.postgres_database_manager.repository.UserRepository;
import ai.kolate.postgres_database_manager.service.ProjectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectUserRepository projectUserRepository;
    private final UserRepository userRepository;
    private final DefaultRoleRepository defaultRoleRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    @Override
    public ProjectResponse createProject(CreateProjectRequest request) {
        log.info("Creating project with name: {}", request.getName());

        // Check if project name already exists
        if (projectRepository.existsByNameIgnoreCase(request.getName())) {
            throw new IllegalArgumentException("Project with name '" + request.getName() + "' already exists");
        }

        // Step 1: Create project
        Project project = Project.builder()
                .name(request.getName())
                .description(request.getDescription())
                .status(ProjectStatus.ACTIVE)
                .createdBy(request.getCreatedBy())
                .updatedBy(request.getCreatedBy())
                .projectUsers(new HashSet<>())
                .build();

        Project savedProject = projectRepository.save(project);

        // Step 2: Fetch default role-permission data using native DTO
        List<DefaultRolePermissionDTO> flatList = defaultRoleRepository.findAllDefaultRolePermissionsFlat();

        // Step 3: Group role + permissions in-memory
        Map<String, Role> roleMap = new HashMap<>();

        for (DefaultRolePermissionDTO row : flatList) {
            Role role = roleMap.computeIfAbsent(row.getRoleName(), roleName -> {
                Role newRole = Role.builder()
                        .name(roleName)
                        .description(row.getDescription())
                        .project(savedProject)
                        .permissions(new HashSet<>())
                        .build();
                return roleRepository.save(newRole); // persist early to set ID for permissions
            });

            // Skip null permissions (LEFT JOIN case)
            if (row.getModule() != null && row.getAccessType() != null) {
                Permission permission = Permission.builder()
                        .role(role)
                        .module(ModuleType.valueOf(row.getModule()))
                        .accessType(AccessType.valueOf(row.getAccessType()))
                        .build();
                permissionRepository.save(permission);
            }
        }

        log.info("Project Users :: {}", request.getProjectUsers());
        // Add users to project if specified
        if (request.getProjectUsers() != null && !request.getProjectUsers().isEmpty()) {
            for (ProjectUserRequest userRequest : request.getProjectUsers()) {
                addUserToProjectInternal(savedProject.getId(), userRequest);
            }
        }

        log.info("Successfully created project with ID: {}", savedProject.getId());
        return convertToProjectResponse(savedProject);
    }

    @Override
    public ProjectResponse updateProject(UUID projectId, UpdateProjectRequest request) {
        log.info("Updating project with ID: {}", projectId);

        Project project = getProjectEntityById(projectId);

        // Update fields if provided
        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            // Check if new name conflicts with existing projects (excluding current project)
            Optional<Project> existingProject = projectRepository.findByNameIgnoreCase(request.getName());
            if (existingProject.isPresent() && !existingProject.get().getId().equals(projectId)) {
                throw new IllegalArgumentException("Project with name '" + request.getName() + "' already exists");
            }
            project.setName(request.getName());
        }

        if (request.getDescription() != null) {
            project.setDescription(request.getDescription());
        }

        if (request.getStatus() != null) {
            project.setStatus(request.getStatus());
        }

        if (request.getUpdatedBy() != null && !request.getUpdatedBy().trim().isEmpty()) {
            project.setUpdatedBy(request.getUpdatedBy());
        }

        Project updatedProject = projectRepository.save(project);
        log.info("Successfully updated project with ID: {}", projectId);

        return convertToProjectResponse(updatedProject);
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectResponse getProjectById(UUID projectId) {
        log.debug("Getting project by ID: {}", projectId);
        Project project = getProjectEntityById(projectId);
        return convertToProjectResponse(project);
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectSummaryResponse getProjectSummaryById(UUID projectId) {
        log.debug("Getting project summary by ID: {}", projectId);
        Project project = getProjectEntityById(projectId);
        return convertToProjectSummaryResponse(project);
    }

    @Override
    public void deleteProject(UUID projectId) {
        log.info("Deleting project with ID: {}", projectId);

        if (!projectRepository.existsById(projectId)) {
            throw new IllegalArgumentException("Project with ID " + projectId + " not found");
        }

        // Delete all project users first (cascading should handle this, but being explicit)
        projectUserRepository.deleteByIdProjectId(projectId);

        // Delete the project (roles and permissions will be cascade deleted)
        projectRepository.deleteById(projectId);

        log.info("Successfully deleted project with ID: {}", projectId);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ProjectSummaryResponse> getAllProjects(Pageable pageable) {
        log.debug("Getting all projects with pagination");
        Page<Project> projectPage = projectRepository.findAll(pageable);
        return convertToPagedResponse(projectPage);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ProjectSummaryResponse> getProjectsByStatus(ProjectStatus status, Pageable pageable) {
        log.debug("Getting projects by status: {}", status);
        Page<Project> projectPage = projectRepository.findByStatus(status, pageable);
        return convertToPagedResponse(projectPage);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ProjectSummaryResponse> searchProjectsByName(String namePattern, Pageable pageable) {
        log.debug("Searching projects by name pattern: {}", namePattern);
        Page<Project> projectPage = projectRepository.findByNameContainingIgnoreCase(namePattern, pageable);
        return convertToPagedResponse(projectPage);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ProjectSummaryResponse> getProjectsByCreatedBy(String createdBy, Pageable pageable) {
        log.debug("Getting projects created by: {}", createdBy);
        Page<Project> projectPage = projectRepository.findByCreatedBy(createdBy, pageable);
        return convertToPagedResponse(projectPage);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectSummaryResponse> getProjectsCreatedBetween(OffsetDateTime startDate, OffsetDateTime endDate) {
        log.debug("Getting projects created between {} and {}", startDate, endDate);
        List<Project> projects = projectRepository.findProjectsCreatedBetween(startDate, endDate);
        return projects.stream()
                .map(this::convertToProjectSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectSummaryResponse> getProjectsByUser(String userAuth0Id) {
        log.debug("Getting projects for user: {}", userAuth0Id);
        List<Project> projects = projectRepository.findProjectsByUserAuth0Id(userAuth0Id);
        return projects.stream()
                .map(project -> convertToProjectSummaryResponse(project, userAuth0Id))
                .collect(Collectors.toList());
    }

    @Override
    public List<UserProjectRoleWithPermissionsDTO> getUserProjectsWithRolesAndPermissions(String userAuth0Id) {
        List<UserProjectRoleDTO> userProjectRoles = projectUserRepository.findUserProjectRolesNative(userAuth0Id);

        return userProjectRoles.stream()
                .map(this::mapToUserProjectRoleWithPermissions)
                .collect(Collectors.toList());
    }

    // Project User Management

    @Override
    public void addUserToProject(UUID projectId, ProjectUserRequest request) {
        log.info("Adding user {} to project {}", request.getUserAuth0Id(), projectId);
        addUserToProjectInternal(projectId, request);
    }

    @Override
    public void removeUserFromProject(UUID projectId, String userAuth0Id) {
        log.info("Removing user {} from project {}", userAuth0Id, projectId);

        if (!projectRepository.existsById(projectId)) {
            throw new IllegalArgumentException("Project with ID " + projectId + " not found");
        }

        ProjectUserId projectUserId = new ProjectUserId(projectId, userAuth0Id);
        if (!projectUserRepository.existsById(projectUserId)) {
            throw new IllegalArgumentException("User " + userAuth0Id + " is not associated with project " + projectId);
        }

        projectUserRepository.deleteById(projectUserId);
        log.info("Successfully removed user {} from project {}", userAuth0Id, projectId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectUserResponse> getProjectUsers(UUID projectId) {
        log.debug("Getting all users for project: {}", projectId);

        if (!projectRepository.existsById(projectId)) {
            throw new IllegalArgumentException("Project with ID " + projectId + " not found");
        }

        List<ProjectUser> projectUsers = projectUserRepository.findByIdProjectId(projectId);
        return projectUsers.stream()
                .map(this::convertToProjectUserResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isUserInProject(UUID projectId, String userAuth0Id) {
        log.debug("Checking if user {} is in project {}", userAuth0Id, projectId);
        ProjectUserId projectUserId = new ProjectUserId(projectId, userAuth0Id);
        return projectUserRepository.existsById(projectUserId);
    }

    // NEW ROLE MANAGEMENT METHODS

    @Override
    @Transactional(readOnly = true)
    public List<RoleDTO> getProjectRoles(UUID projectId) {
        log.debug("Getting all roles for project: {}", projectId);

        if (!projectRepository.existsById(projectId)) {
            throw new IllegalArgumentException("Project with ID " + projectId + " not found");
        }

        return roleRepository.findByProjectId(projectId)
                .stream()
                .map(role -> RoleDTO.builder()
                        .id(role.getId())
                        .name(role.getName())
                        .description(role.getDescription())
                        .build())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Role> getProjectRolesWithPermissions(UUID projectId) {
        log.debug("Getting all roles with permissions for project: {}", projectId);

        if (!projectRepository.existsById(projectId)) {
            throw new IllegalArgumentException("Project with ID " + projectId + " not found");
        }

        return roleRepository.findByProjectIdWithPermissions(projectId);
    }

    @Override
    public void attachRoleToUser(UUID projectId, String userAuth0Id, UUID roleId) {
        log.info("Attaching role {} to user {} in project {}", roleId, userAuth0Id, projectId);

        // Validate project exists
        if (!projectRepository.existsById(projectId)) {
            throw new IllegalArgumentException("Project with ID " + projectId + " not found");
        }

        // Validate user exists
        User user = userRepository.findByAuth0Id(userAuth0Id)
                .orElseThrow(() -> new IllegalArgumentException("User with Auth0 ID " + userAuth0Id + " not found"));

        // Validate role exists and belongs to the project
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new IllegalArgumentException("Role with ID " + roleId + " not found"));

        if (!role.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Role does not belong to the specified project");
        }

        // Check if user is already in project
        ProjectUserId projectUserId = new ProjectUserId(projectId, userAuth0Id);
        Optional<ProjectUser> existingProjectUser = projectUserRepository.findById(projectUserId);

        if (existingProjectUser.isPresent()) {
            // Update existing user's role
            ProjectUser projectUser = existingProjectUser.get();
            projectUser.setRole(role);
            projectUserRepository.save(projectUser);
            log.info("Updated role for existing user {} in project {} to role {}", userAuth0Id, projectId, role.getName());
        } else {
            // Create new project user association
            ProjectUser projectUser = ProjectUser.builder()
                    .id(projectUserId)
                    .user(user)
                    .role(role)
                    .build();
            projectUserRepository.save(projectUser);
            log.info("Successfully attached role {} to user {} in project {}", role.getName(), userAuth0Id, projectId);
        }
    }

    @Override
    public void changeUserRole(UUID projectId, String userAuth0Id, UUID newRoleId) {
        log.info("Changing role for user {} in project {} to role {}", userAuth0Id, projectId, newRoleId);

        // Validate project exists
        if (!projectRepository.existsById(projectId)) {
            throw new IllegalArgumentException("Project with ID " + projectId + " not found");
        }

        // Validate new role exists and belongs to the project
        Role newRole = roleRepository.findById(newRoleId)
                .orElseThrow(() -> new IllegalArgumentException("Role with ID " + newRoleId + " not found"));

        if (!newRole.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Role does not belong to the specified project");
        }

        // Find existing project user
        ProjectUserId projectUserId = new ProjectUserId(projectId, userAuth0Id);
        ProjectUser projectUser = projectUserRepository.findById(projectUserId)
                .orElseThrow(() -> new IllegalArgumentException("User " + userAuth0Id + " is not associated with project " + projectId));

        // Update role
        projectUser.setRole(newRole);
        projectUserRepository.save(projectUser);

        log.info("Successfully changed role for user {} in project {} to {}", userAuth0Id, projectId, newRole.getName());
    }

        @Override
        @Transactional(readOnly = true)
        public RoleResponseDTO getUserRoleInProject(UUID projectId, String userAuth0Id) {
            log.info("Getting role for user {} in project {}", userAuth0Id, projectId);

            ProjectUserId id = new ProjectUserId(projectId, userAuth0Id);
            ProjectUser projectUser = projectUserRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("User not assigned to project"));

            UUID roleId = projectUser.getRole().getId();
            List<RolePermissionDTO> rows = roleRepository.findRoleWithPermissionsById(roleId);

            if (rows.isEmpty()) {
                throw new IllegalArgumentException("Role not found or no permissions assigned");
            }

            // Use the first row for role name/id
            RolePermissionDTO first = rows.getFirst();

            rows.forEach((row)->{
                log.info("Roles permissions :: {}:{}", row.getModule(),row.getAccessType());
            });

            Map<ModuleType, AccessType> permissions = rows.stream()
                    .filter(r -> r.getModule() != null && r.getAccessType() != null)
                    .collect(Collectors.toMap(
                            r -> ModuleType.valueOf(r.getModule()),
                            r -> AccessType.valueOf(r.getAccessType())
                    ));

            return RoleResponseDTO.builder()
                    .id(first.getRoleId())
                    .name(first.getRoleName())
                    .description(first.getRoleDescription())
                    .permissions(permissions)
                    .build();
        }

    // Statistics and Counts

    @Override
    @Transactional(readOnly = true)
    public ProjectStatsResponse getProjectStatistics() {
        log.debug("Getting project statistics");

        long totalProjects = projectRepository.count();
        long activeProjects = projectRepository.countByStatus(ProjectStatus.ACTIVE);
        long completedProjects = projectRepository.countByStatus(ProjectStatus.COMPLETED);
        long totalUsers = projectUserRepository.count();

        return ProjectStatsResponse.builder()
                .totalProjects(totalProjects)
                .activeProjects(activeProjects)
                .completedProjects(completedProjects)
                .totalMembers(totalUsers)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public long countProjectsByStatus(ProjectStatus status) {
        log.debug("Counting projects by status: {}", status);
        return projectRepository.countByStatus(status);
    }

    @Override
    @Transactional(readOnly = true)
    public long countUsersInProject(UUID projectId) {
        log.debug("Counting users in project: {}", projectId);
        if (!projectRepository.existsById(projectId)) {
            throw new IllegalArgumentException("Project with ID " + projectId + " not found");
        }
        return projectUserRepository.countByIdProjectId(projectId);
    }

    // Helper Methods

    private Project getProjectEntityById(UUID projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project with ID " + projectId + " not found"));
    }

    private void addUserToProjectInternal(UUID projectId, ProjectUserRequest request) {
        // Validate project exists
        if (!projectRepository.existsById(projectId)) {
            throw new IllegalArgumentException("Project with ID " + projectId + " not found");
        }

        // Validate user exists
        User user = userRepository.findByAuth0Id(request.getUserAuth0Id())
                .orElseThrow(() -> new IllegalArgumentException("User with Auth0 ID " + request.getUserAuth0Id() + " not found"));

        // Check if user is already in project
        ProjectUserId projectUserId = new ProjectUserId(projectId, request.getUserAuth0Id());
        if (projectUserRepository.existsById(projectUserId)) {
            throw new IllegalArgumentException("User " + request.getUserAuth0Id() + " is already associated with project " + projectId);
        }

        // Find the role for this project - assume request has roleId or default to MEMBER
        Role role = null;
        if (request.getRoleId() != null) {
            role = roleRepository.findById(request.getRoleId())
                    .orElseThrow(() -> new IllegalArgumentException("Role with ID " + request.getRoleId() + " not found"));

            // Validate role belongs to this project
            if (!role.getProject().getId().equals(projectId)) {
                throw new IllegalArgumentException("Role does not belong to the specified project");
            }
        } else {
            // Default to MEMBER role for this project
            role = roleRepository.findByNameAndProjectId(request.getRole() !=null ? request.getRole() : "MEMBER", projectId)
                    .orElseThrow(() -> new IllegalArgumentException("Default MEMBER role not found for project " + projectId));
        }

        // Create project user association
        ProjectUser projectUser = ProjectUser.builder()
                .id(projectUserId)
                .user(user)
                .role(role)
                .build();

        projectUserRepository.save(projectUser);
        log.info("Successfully added user {} to project {} with role {}", request.getUserAuth0Id(), projectId, role.getName());
    }

    @Override
    public RoleResponseDTO addRoleToProject(UUID projectId, CreateProjectRoleRequest request) {
        log.info("Adding role '{}' to project {}", request.getName(), projectId);

        // ✅ Fetch the project first
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project with ID " + projectId + " not found"));

        // ✅ Save role first
        Role role = roleRepository.save(Role.builder()
                .name(request.getName())
                .description(request.getDescription())
                .project(project)
                .build());

        log.info("Successfully created role '{}' (ID: {}) for project '{}'",
                role.getName(), role.getId(), project.getName());

        // ✅ Prepare permission entities
        Map<ModuleType, AccessType> permissionsMap =
                request.getRolePermissions() != null ? request.getRolePermissions() : Map.of();

        List<Permission> permissionEntities = new ArrayList<>();

        permissionsMap.forEach((moduleType, accessType) -> {
            if (moduleType == null || accessType == null) {
                throw new IllegalArgumentException("Module and AccessType cannot be null for role permissions");
            }

            Permission permission = Permission.builder()
                    .role(role)
                    .module(moduleType)
                    .accessType(accessType)
                    .build();

            permissionEntities.add(permission);

            log.info("Attached permission {}:{} to role '{}'",
                    moduleType, accessType, role.getName());
        });

        // ✅ Save permissions if provided
        if (!permissionEntities.isEmpty()) {
            permissionRepository.saveAll(permissionEntities);
        }

        // ✅ Build and return DTO
        return RoleResponseDTO.builder()
                .id(role.getId())
                .name(role.getName())
                .description(role.getDescription())
                .permissions(permissionsMap)
                .build();
    }

    @Transactional
    @Override
    public void deleteRoleFromProject(UUID projectId, UUID roleId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new IllegalArgumentException("Role not found"));

        if (!role.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Role does not belong to the specified project");
        }

        boolean isRoleAssigned = projectUserRepository.existsByIdProjectIdAndRoleId(projectId, roleId);
        if (isRoleAssigned) {
            throw new IllegalStateException("Cannot delete role because it is assigned to one or more users.");
        }

        permissionRepository.deleteAllByRoleId(roleId);
        roleRepository.deleteById(roleId);
    }

    @Transactional
    @Override
    public String moveUsersAndDeleteRole(UUID projectId, UUID oldRoleId, UUID newRoleId) {
        // 1️⃣ Validate both roles exist
        Role oldRole = roleRepository.findById(oldRoleId)
                .orElseThrow(() -> new IllegalArgumentException("Old role not found"));
        Role newRole = roleRepository.findById(newRoleId)
                .orElseThrow(() -> new IllegalArgumentException("New role not found"));

        // 2️⃣ Validate they belong to the same project
        if (!oldRole.getProject().getId().equals(projectId) || !newRole.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Roles do not belong to the specified project");
        }

        // 3️⃣ Update all users with oldRole → newRole
        int updatedUsers = projectUserRepository.updateRoleForUsers(projectId, oldRoleId, newRoleId);

        log.info("Moved {} users from role '{}' to role '{}' in project '{}'",
                updatedUsers, oldRole.getName(), newRole.getName(), oldRole.getProject().getName());

        // 4️⃣ Delete all permissions for old role
        permissionRepository.deleteAllByRoleId(oldRoleId);

        // 5️⃣ Delete old role
        roleRepository.deleteById(oldRoleId);

        return "Moved " + updatedUsers + " users and deleted old role successfully.";
    }

    @Transactional
    @Override
    public RoleResponseDTO updateRoleAndPermissions(UpdateRolePermissionsRequest request) {
        // 1️⃣ Fetch role
        Role role = roleRepository.findById(request.getId())
                .orElseThrow(() -> new IllegalArgumentException("Role not found"));

        // ✅ 1.1 Update role name & description if provided
        boolean roleUpdated = false;

        if (request.getName() != null && !request.getName().trim().isEmpty()
                && !request.getName().equals(role.getName())) {
            role.setName(request.getName());
            roleUpdated = true;
        }

        if (request.getDescription() != null && !request.getDescription().trim().isEmpty()
                && !request.getDescription().equals(role.getDescription())) {
            role.setDescription(request.getDescription());
            roleUpdated = true;
        }

        // ✅ Only save role if name or description changed
        if (roleUpdated) {
            roleRepository.save(role);
        }

        // 2️⃣ Fetch all permissions for this role in one go
        List<Permission> existingPermissions = permissionRepository.findByRoleId(role.getId());
        Map<ModuleType, Permission> existingMap = existingPermissions.stream()
                .collect(Collectors.toMap(Permission::getModule, p -> p));

        List<Permission> toSaveOrUpdate = new ArrayList<>();
        Set<ModuleType> modulesInPayload = new HashSet<>();
        Map<ModuleType, AccessType> updatedPermissions = new HashMap<>();

        // 3️⃣ Iterate through payload once
        for (Map.Entry<String, String> entry : request.getPermissions().entrySet()) {
            ModuleType moduleEnum = ModuleType.valueOf(entry.getKey().trim().toUpperCase());
            AccessType accessTypeEnum = AccessType.valueOf(entry.getValue().trim().toUpperCase());
            modulesInPayload.add(moduleEnum);

            if (existingMap.containsKey(moduleEnum)) {
                Permission permission = existingMap.get(moduleEnum);
                if (!permission.getAccessType().equals(accessTypeEnum)) {
                    permission.setAccessType(accessTypeEnum);
                    toSaveOrUpdate.add(permission);
                }
            } else {
                Permission newPermission = Permission.builder()
                        .role(role)
                        .module(moduleEnum)
                        .accessType(accessTypeEnum)
                        .build();
                toSaveOrUpdate.add(newPermission);
            }

            updatedPermissions.put(moduleEnum, accessTypeEnum);
        }

        // 5️⃣ Bulk save updates and inserts (one DB call)
        if (!toSaveOrUpdate.isEmpty()) {
            permissionRepository.saveAll(toSaveOrUpdate);
        }

        // 6️⃣ Return updated role info
        return RoleResponseDTO.builder()
                .id(role.getId())
                .name(role.getName())
                .description(role.getDescription())
                .permissions(updatedPermissions)
                .build();
    }


    private ProjectResponse convertToProjectResponse(Project project) {
        List<ProjectUserResponse> projectUsers = project.getProjectUsers().stream()
                .map(this::convertToProjectUserResponse)
                .collect(Collectors.toList());

        return ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .status(project.getStatus())
                .createdBy(project.getCreatedBy())
                .updatedBy(project.getUpdatedBy())
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .projectUsers(projectUsers)
                .build();
    }

    private ProjectSummaryResponse convertToProjectSummaryResponse(Project project) {
        List<ProjectUserResponse> projectUsers = project.getProjectUsers().stream()
                .map(this::convertToProjectUserResponse)
                .toList();

        return ProjectSummaryResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .status(project.getStatus())
                .createdBy(project.getCreatedBy())
                .updatedBy(project.getUpdatedBy())
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .memberCount((long) (project.getProjectUsers() != null ? project.getProjectUsers().size() : 0))
                .projectUsers(projectUsers)
                .build();
    }

    private ProjectSummaryResponse convertToProjectSummaryResponse(Project project, String userAuth0Id) {
        List<ProjectUserResponse> projectUsers = project.getProjectUsers().stream()
                .map(this::convertToProjectUserResponse)
                .toList();

        // Find the requesting user's role
        String userRole = project.getProjectUsers().stream()
                .filter(pu -> pu.getId().getUserAuth0Id().equals(userAuth0Id))
                .findFirst()
                .map(pu -> pu.getRole().getName())
                .orElse(null);

        return ProjectSummaryResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .status(project.getStatus())
                .createdBy(project.getCreatedBy())
                .updatedBy(project.getUpdatedBy())
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .memberCount((long) (project.getProjectUsers() != null ? project.getProjectUsers().size() : 0))
                .projectUsers(projectUsers)
                .userRole(userRole)
                .build();
    }

    private ProjectUserResponse convertToProjectUserResponse(ProjectUser projectUser) {
        return ProjectUserResponse.builder()
                .userAuth0Id(projectUser.getId().getUserAuth0Id())
                .firstName(projectUser.getUser() != null ? projectUser.getUser().getFirstName() : null)
                .lastName(projectUser.getUser() != null ? projectUser.getUser().getLastName() : null)
                .email(projectUser.getUser() != null ? projectUser.getUser().getEmail() : null)
                .avatarUrl(projectUser.getUser() != null ? projectUser.getUser().getAvatarUrl() : null)
                .jobTitle(projectUser.getUser() != null ? projectUser.getUser().getJobTitle() : null)
                .roleId(projectUser.getRole() != null ? projectUser.getRole().getId() : null)
                .roleName(projectUser.getRole() != null ? projectUser.getRole().getName() : null)
                .build();
    }


    private PagedResponse<ProjectSummaryResponse> convertToPagedResponse(Page<Project> projectPage) {
        List<ProjectSummaryResponse> content = projectPage.getContent().stream()
                .map(this::convertToProjectSummaryResponse)
                .collect(Collectors.toList());

        return PagedResponse.<ProjectSummaryResponse>builder()
                .content(content)
                .size(projectPage.getSize())
                .page(projectPage.getNumber())
                .totalElements(projectPage.getTotalElements())
                .totalPages(projectPage.getTotalPages())
                .first(projectPage.isFirst())
                .last(projectPage.isLast())
                .empty(projectPage.isEmpty())
                .build();
    }

    private UserProjectRoleWithPermissionsDTO mapToUserProjectRoleWithPermissions(UserProjectRoleDTO dto) {
        // Fetch permissions for this role
        List<RolePermissionDTO> permissions = permissionRepository.findPermissionsByRoleId(dto.getRoleId());

        Map<String, String> permissionsMap = permissions.stream()
                .collect(Collectors.toMap(
                        RolePermissionDTO::getModule,
                        RolePermissionDTO::getAccessType
                ));

        return UserProjectRoleWithPermissionsDTO.builder()
                .projectId(dto.getProjectId())
                .projectName(dto.getProjectName())
                .role(dto.getRole())
                .roleId(dto.getRoleId())
                .permissions(permissionsMap)
                .build();
    }

    @Override
    public RoleResponseDTO getRoleWithPermissions(UUID roleId) {
        // 1️⃣ Fetch the role
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new IllegalArgumentException("Role not found"));

        // 2️⃣ Fetch permissions
        List<Permission> permissions = permissionRepository.findByRoleId(role.getId());

        // 3️⃣ Convert permissions to Map<ModuleType, AccessType>
        Map<ModuleType, AccessType> permissionMap = permissions.stream()
                .collect(Collectors.toMap(Permission::getModule, Permission::getAccessType));

        // 4️⃣ Return DTO
        return RoleResponseDTO.builder()
                .id(role.getId())
                .name(role.getName())
                .description(role.getDescription())
                .permissions(permissionMap)
                .build();
    }
}
