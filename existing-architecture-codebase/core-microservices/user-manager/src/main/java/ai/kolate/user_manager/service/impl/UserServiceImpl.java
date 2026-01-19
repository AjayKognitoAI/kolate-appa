package ai.kolate.user_manager.service.impl;

import ai.kolate.user_manager.client.AppDataConfig;
import ai.kolate.user_manager.client.AuthManagerClient;
import ai.kolate.user_manager.client.UserFeignClient;
import ai.kolate.user_manager.dto.ChangeRoleRequestDTO;
import ai.kolate.user_manager.dto.CreateUserRequestDTO;
import ai.kolate.user_manager.dto.InviteUserRequestDTO;
import ai.kolate.user_manager.dto.InviteUserResponseDTO;
import ai.kolate.user_manager.dto.PagedResponse;
import ai.kolate.user_manager.dto.UserResponseDTO;
import ai.kolate.user_manager.dto.auth.AssignRolesRequestDTO;
import ai.kolate.user_manager.dto.auth.Auth0BlockUnblockUserRequestDTO;
import ai.kolate.user_manager.dto.auth.InvitationRequestDTO;
import ai.kolate.user_manager.dto.auth.InvitationResponseDTO;
import ai.kolate.user_manager.dto.auth.RoleResponseDTO;
import ai.kolate.user_manager.dto.kafka.CreateInvitedAdminRequestDTO;
import ai.kolate.user_manager.dto.kafka.DeleteAdminRequestDTO;
import ai.kolate.user_manager.dto.kafka.UpdateAdminRequestDTO;
import ai.kolate.user_manager.model.User;
import ai.kolate.user_manager.model.enums.KafkaTopics;
import ai.kolate.user_manager.model.enums.UserStatus;
import ai.kolate.user_manager.service.MessagePublisherService;
import ai.kolate.user_manager.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserFeignClient userFeignClient;
    private final AuthManagerClient authManagerClient;
    private final RedisTemplate<String, String> redisTemplate;
    private final MessagePublisherService messagePublisherService;
    private final HttpServletRequest servletRequest;
    private final AppDataConfig dataConfig;

    @Value("${auth.client.id:}")
    private String clientId;

    @Value("${auth.connection.id:}")
    private String connectionId;

    private static final String REDIS_ENTERPRISE_ADMIN_KEY_PATTERN = "is_org_admin:%s";
    private static final String REDIS_ENTERPRISE_MEMBER_KEY_PATTERN = "is_org_member:%s";

    @Override
    public UserResponseDTO createUser(CreateUserRequestDTO request) {
        log.info("Creating user with auth0Id: {}", request.getAuth0Id());

        String email = request.getEmail();
        String orgId = request.getOrganizationId();
        String auth0Id = request.getAuth0Id();

        // Redis keys
        String adminKey = String.format(REDIS_ENTERPRISE_ADMIN_KEY_PATTERN, email);
        String memberKey = String.format(REDIS_ENTERPRISE_MEMBER_KEY_PATTERN, email);

        // Redis values
        String cachedAdminOrgId = redisTemplate.opsForValue().get(adminKey);
        String cachedMemberOrgId = redisTemplate.opsForValue().get(memberKey);

        try {
            if (StringUtils.isNotEmpty(cachedAdminOrgId) && orgId.equals(cachedAdminOrgId)) {
                assignRoleAndCleanup(
                        request, dataConfig.getEnterpriseAdminRoleId(),
                        adminKey, "admin"
                );

                // Notify other services via Kafka
                UpdateAdminRequestDTO adminUpdate = UpdateAdminRequestDTO.builder()
                        .organizationId(orgId)
                        .auth0Id(auth0Id)
                        .adminEmail(email)
                        .firstName(request.getFirstName())
                        .lastName(request.getLastName())
                        .build();

                messagePublisherService.publishMessage(adminUpdate, KafkaTopics.TOPIC_UPDATE_ENTERPRISE_ADMIN);
            }

            if (StringUtils.isNotEmpty(cachedMemberOrgId) && orgId.equals(cachedMemberOrgId)) {
                assignRoleAndCleanup(
                        request, dataConfig.getEnterpriseMemberRoleId(),
                        memberKey, "member"
                );
            }
        } catch (Exception ex) {
            log.error("Error assigning role to user {} for organization {}: {}", auth0Id, orgId, ex.getMessage(), ex);
            throw new RuntimeException("Failed to assign role", ex);
        }

        // Persist user
        User user = User.builder()
                .auth0Id(auth0Id)
                .organizationId(orgId)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .avatarUrl(request.getAvatarUrl())
                .email(email)
                .mobile(request.getMobile())
                .build();

        User createdUser = userFeignClient.createUser(user);
        return mapToUserResponseDTO(createdUser);
    }

    private void assignRoleAndCleanup(CreateUserRequestDTO request, String roleId, String redisKey, String roleType) {
        AssignRolesRequestDTO roleRequest = buildAssignRolesRequest(request, roleId);
        ResponseEntity<Void> response = authManagerClient.assignRolesToOrganizationMember(roleRequest);

        if (response.getStatusCode().is2xxSuccessful()) {
            log.info("Assigned {} role to {} for organization {}", roleType, request.getAuth0Id(), request.getOrganizationId());
            redisTemplate.delete(redisKey);
        } else {
            log.error("Failed to assign {} role to {} for org {}. Status: {}", roleType, request.getAuth0Id(), request.getOrganizationId(), response.getStatusCode());
            throw new RuntimeException("Auth-manager responded with non-success status for role assignment.");
        }
    }

    @Override
    public UserResponseDTO getUserByAuth0Id(String auth0Id) {
        log.info("Fetching user by auth0Id: {}", auth0Id);
        User user = userFeignClient.getUserByAuth0Id(auth0Id);
        return mapToUserResponseDTO(user);
    }

    @Override
    public InviteUserResponseDTO inviteUserToOrganization(InviteUserRequestDTO request, String organizationId) {
        if (StringUtils.isBlank(organizationId)) {
            log.error("Missing organizationId for invite");
            throw new IllegalArgumentException("Organization ID is required to invite user.");
        }

        String inviteeEmail = request.getInviteeEmail();
        String roleId = request.getRoleId();
        log.info("Inviting user {} to organization {} with role {}", inviteeEmail, organizationId, roleId);

        boolean isEnterpriseAdmin = dataConfig.getEnterpriseAdminRoleId().equals(roleId);
        boolean isEnterpriseMember = dataConfig.getEnterpriseMemberRoleId().equals(roleId);

        if (isEnterpriseAdmin) {
            handleEnterpriseAdminInvite(inviteeEmail, organizationId);
        } else if (isEnterpriseMember) {
            handleEnterpriseMemberInvite(inviteeEmail, organizationId);
        }

        try {
            InvitationRequestDTO invitationRequest = buildInvitationRequest(request);
            ResponseEntity<InvitationResponseDTO> response = authManagerClient.sendOrganizationInvitation(organizationId, invitationRequest);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.info("Invitation sent to {} for organization {}", inviteeEmail, organizationId);
                return InviteUserResponseDTO.builder()
                        .invitationUrl(response.getBody().getInvitationUrl())
                        .build();
            } else {
                log.error("Failed to invite user {} to org {}. Status: {}", inviteeEmail, organizationId, response.getStatusCode());
                throw new RuntimeException("Failed to send invitation - Invalid response from auth-manager");
            }

        } catch (Exception ex) {
            log.error("Error sending invitation to {}: {}", inviteeEmail, ex.getMessage(), ex);
            throw new RuntimeException("Failed to send invitation", ex);
        }
    }

    private void handleEnterpriseAdminInvite(String email, String organizationId) {
        String redisKey = String.format(REDIS_ENTERPRISE_ADMIN_KEY_PATTERN, email);
        redisTemplate.opsForValue().set(redisKey, organizationId);

        CreateInvitedAdminRequestDTO adminRequestDTO = CreateInvitedAdminRequestDTO.builder()
                .organizationId(organizationId)
                .adminEmail(email)
                .build();

        messagePublisherService.publishMessage(adminRequestDTO, KafkaTopics.TOPIC_CREATE_ENTERPRISE_ADMIN);
    }

    private void handleEnterpriseMemberInvite(String email, String organizationId) {
        String redisKey = String.format(REDIS_ENTERPRISE_MEMBER_KEY_PATTERN, email);
        redisTemplate.opsForValue().set(redisKey, organizationId);
    }

    @Override
    public PagedResponse<UserResponseDTO> getUsersByOrganizationId(String organizationId, int page, int size, String sortBy, String sortDirection) {
        log.info("Fetching users for organization: {} with page: {}, size: {}, sortBy: {}, sortDirection: {}",
                organizationId, page, size, sortBy, sortDirection);

        try {
            PagedResponse<User> pagedUsers = userFeignClient.getUsersByOrganizationId(organizationId, page, size, sortBy, sortDirection);

            return PagedResponse.<UserResponseDTO>builder()
                    .content(pagedUsers.getContent().stream()
                            .map(this::mapToUserResponseDTO)
                            .collect(Collectors.toList()))
                    .page(pagedUsers.getPage())
                    .size(pagedUsers.getSize())
                    .totalElements(pagedUsers.getTotalElements())
                    .totalPages(pagedUsers.getTotalPages())
                    .first(pagedUsers.isFirst())
                    .last(pagedUsers.isLast())
                    .numberOfElements(pagedUsers.getNumberOfElements())
                    .empty(pagedUsers.isEmpty())
                    .build();

        } catch (Exception ex) {
            log.error("Error fetching users for organization {}: {}", organizationId, ex.getMessage(), ex);
            throw new RuntimeException("Failed to fetch users for organization", ex);
        }
    }

    @Override
    public PagedResponse<UserResponseDTO> getAllUsers(int page, int size, String sortBy, String sortDirection) {
        log.info("Fetching all users with page: {}, size: {}, sortBy: {}, sortDirection: {}",
                page, size, sortBy, sortDirection);

        try {
            PagedResponse<User> pagedUsers = userFeignClient.getAllUsers(page, size, sortBy, sortDirection);

            return PagedResponse.<UserResponseDTO>builder()
                    .content(pagedUsers.getContent().stream()
                            .map(this::mapToUserResponseDTO)
                            .collect(Collectors.toList()))
                    .page(pagedUsers.getPage())
                    .size(pagedUsers.getSize())
                    .totalElements(pagedUsers.getTotalElements())
                    .totalPages(pagedUsers.getTotalPages())
                    .first(pagedUsers.isFirst())
                    .last(pagedUsers.isLast())
                    .numberOfElements(pagedUsers.getNumberOfElements())
                    .empty(pagedUsers.isEmpty())
                    .build();

        } catch (Exception ex) {
            log.error("Error fetching all users: {}", ex.getMessage(), ex);
            throw new RuntimeException("Failed to fetch all users", ex);
        }
    }

    @Override
    public List<RoleResponseDTO> getAllRoles() {
        log.info("Fetching all available roles");
        try {
            List<RoleResponseDTO> roles = authManagerClient.getRoles();
            // Filter out the 'root:admin' role
            List<RoleResponseDTO> filteredRoles = roles.stream()
                    .filter(role -> !dataConfig.getRootAdminRoleName().equals(role.getName()))
                    .collect(Collectors.toList());
            log.info("Successfully retrieved {} roles (filtered {} total roles)", filteredRoles.size(), roles.size());
            return filteredRoles;
        } catch (Exception ex) {
            log.error("Error fetching roles: {}", ex.getMessage(), ex);
            throw new RuntimeException("Failed to fetch roles", ex);
        }
    }

    @Override
    public void changeUserRole(ChangeRoleRequestDTO request, String organizationId) {
        AssignRolesRequestDTO roleRequest = buildAssignRolesRequest(request, organizationId);
        ResponseEntity<Void> response = authManagerClient.changeRolesOfOrganizationMember(roleRequest);

        if (response.getStatusCode().is2xxSuccessful()) {
            log.info("Assigned {} role to {} for organization {}", request.getRoleId() ,request.getUserId(), organizationId);

            User user = userFeignClient.getUserByAuth0Id(request.getUserId());

//          if new role is admin - update the user at enterprise admin table
            if(dataConfig.getEnterpriseAdminRoleId().equals(request.getRoleId())) {
                CreateInvitedAdminRequestDTO kafkaMsgDTO = CreateInvitedAdminRequestDTO.builder()
                        .firstName(user.getFirstName())
                        .lastName(user.getLastName())
                        .adminAuth0Id(user.getAuth0Id())
                        .organizationId(organizationId)
                        .adminEmail(user.getEmail())
                        .build();

                messagePublisherService.publishMessage(kafkaMsgDTO, KafkaTopics.TOPIC_CREATE_ENTERPRISE_ADMIN);
            }
//          else if new role is member - delete the user at enterprise admin table
            else if(dataConfig.getEnterpriseMemberRoleId().equals(request.getRoleId())) {
                DeleteAdminRequestDTO kafkaMsgDTO = DeleteAdminRequestDTO.builder()
                        .adminEmail(user.getEmail())
                        .build();

                messagePublisherService.publishMessage(kafkaMsgDTO, KafkaTopics.TOPIC_DELETE_ENTERPRISE_ADMIN);
            }
        } else {
            log.error("Failed to assign {} role to {} for org {}. Status: {}", request.getRoleId() ,request.getUserId(), organizationId, response.getStatusCode());
            throw new RuntimeException("Auth-manager responded with non-success status for role assignment.");
        }
    }

    @Override
    public UserResponseDTO blockAndUnblockUser(String action, String auth0Id) {
        log.info("Processing {} action for user with auth0Id: {}", action, auth0Id);

        // Validate action parameter
        if (!("block".equalsIgnoreCase(action) || "unblock".equalsIgnoreCase(action))) {
            log.error("Invalid action provided: {}. Expected 'block' or 'unblock'", action);
            throw new IllegalArgumentException("Invalid action. Expected 'block' or 'unblock'");
        }

        // Validate auth0Id parameter
        if (StringUtils.isBlank(auth0Id)) {
            log.error("Missing auth0Id for {} action", action);
            throw new IllegalArgumentException("Auth0 ID is required to " + action + " user");
        }

        try {
            // First, get the user to ensure they exist
            User user = userFeignClient.getUserByAuth0Id(auth0Id);
            if (user == null) {
                log.error("User not found with auth0Id: {}", auth0Id);
                throw new RuntimeException("User not found with auth0Id: " + auth0Id);
            }

            // Create request DTO for auth manager
            Auth0BlockUnblockUserRequestDTO request = Auth0BlockUnblockUserRequestDTO.builder()
                    .auth0Id(auth0Id)
                    .build();

            // Call auth manager to block/unblock user
            ResponseEntity<Map<String, String>> response = authManagerClient.blockAndUnblockUser(action, request);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Successfully {}ed user with auth0Id: {}", action, auth0Id);

                user.setStatus(action.equals("block") ? UserStatus.BLOCKED : UserStatus.ACTIVE);

                // Get updated user information after block/unblock operation
                User updatedUser = userFeignClient.updateUser(auth0Id, user);
                return mapToUserResponseDTO(updatedUser);

            } else {
                log.error("Failed to {} user with auth0Id: {}. Status: {}", action, auth0Id, response.getStatusCode());
                throw new RuntimeException("Auth-manager responded with non-success status for " + action + " operation");
            }

        } catch (Exception ex) {
            log.error("Error {}ing user with auth0Id {}: {}", action, auth0Id, ex.getMessage(), ex);
            throw new RuntimeException("Failed to " + action + " user", ex);
        }
    }

    @Override
    public PagedResponse<UserResponseDTO> searchUsersByFullName(String query, int page, int size, String sortBy, String sortDirection) {
        log.info("Searching users by full name with query: '{}', page: {}, size: {}, sortBy: {}, sortDirection: {}",
                query, page, size, sortBy, sortDirection);

        // Validate query parameter
        if (StringUtils.isBlank(query)) {
            log.error("Search query cannot be empty or null");
            throw new IllegalArgumentException("Search query is required and cannot be empty");
        }

        try {
            PagedResponse<User> pagedUsers = userFeignClient.searchUsersByFullName(query, page, size, sortBy, sortDirection);

            return PagedResponse.<UserResponseDTO>builder()
                    .content(pagedUsers.getContent().stream()
                            .map(this::mapToUserResponseDTO)
                            .collect(Collectors.toList()))
                    .page(pagedUsers.getPage())
                    .size(pagedUsers.getSize())
                    .totalElements(pagedUsers.getTotalElements())
                    .totalPages(pagedUsers.getTotalPages())
                    .first(pagedUsers.isFirst())
                    .last(pagedUsers.isLast())
                    .numberOfElements(pagedUsers.getNumberOfElements())
                    .empty(pagedUsers.isEmpty())
                    .build();

        } catch (Exception ex) {
            log.error("Error searching users by full name with query '{}': {}", query, ex.getMessage(), ex);
            throw new RuntimeException("Failed to search users by full name", ex);
        }
    }


    @Override
    public Long getUsersCount() {
        log.info("Getting All user count of organization");

        try {
            return userFeignClient.getUsersCount();
        } catch (Exception ex) {
            log.error("Error while getting All user count of organization : {}", ex.getMessage(), ex);
            throw new RuntimeException("Failed to get all user count from org", ex);
        }
    }

    private InvitationRequestDTO buildInvitationRequest(InviteUserRequestDTO request) {
        InvitationRequestDTO invitationRequest = new InvitationRequestDTO();

        InvitationRequestDTO.Inviter inviter = new InvitationRequestDTO.Inviter();
        inviter.setName(request.getInviterName());
        invitationRequest.setInviter(inviter);

        InvitationRequestDTO.Invitee invitee = new InvitationRequestDTO.Invitee();
        invitee.setEmail(request.getInviteeEmail());
        invitationRequest.setInvitee(invitee);

        invitationRequest.setSendInvitationEmail(true);

        if (StringUtils.isNotBlank(request.getRoleId())) {
            invitationRequest.setRoles(Collections.singletonList(request.getRoleId()));
        }

        return invitationRequest;
    }

    private AssignRolesRequestDTO buildAssignRolesRequest(CreateUserRequestDTO request, String roleId) {
        return AssignRolesRequestDTO.builder()
                .organizationId(request.getOrganizationId())
                .userId(request.getAuth0Id())
                .roles(Collections.singletonList(roleId))
                .build();
    }

    private AssignRolesRequestDTO buildAssignRolesRequest(ChangeRoleRequestDTO request, String organizationId) {
        return AssignRolesRequestDTO.builder()
                .organizationId(organizationId)
                .userId(request.getUserId())
                .roles(Collections.singletonList(request.getRoleId()))
                .build();
    }

    private UserResponseDTO mapToUserResponseDTO(User user) {
        return new UserResponseDTO(
                user.getId(),
                user.getAuth0Id(),
                user.getOrganizationId(),
                user.getFirstName(),
                user.getLastName(),
                user.getAvatarUrl(),
                user.getStatus(),
                user.getEmail(),
                user.getMobile()
        );
    }
}