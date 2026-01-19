package ai.kolate.auth_manager.controller;

import ai.kolate.auth_manager.dto.AssignRolesRequestDTO;
import ai.kolate.auth_manager.dto.Auth0BlockUnblockUserRequestDTO;
import ai.kolate.auth_manager.dto.InvitationRequestDTO;
import ai.kolate.auth_manager.dto.InvitationResponseDTO;
import ai.kolate.auth_manager.dto.OrganizationMembersResponseDTO;
import ai.kolate.auth_manager.dto.UserResponseDTO;
import ai.kolate.auth_manager.service.Auth0UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth-manager")
public class UserController {
    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    private final Auth0UserService userService;

    public UserController(Auth0UserService userService) {
        this.userService = userService;
    }

    /**
     * Get organization members with offset pagination
     *
     * @param organizationId The organization ID
     * @param page           Optional page number (0-based, default: 0)
     * @param perPage        Optional number of users per page (default: 50, max: 100)
     * @param fields         Optional comma-separated list of fields to include
     * @param includeFields  Optional whether to include (true) or exclude (false) specified fields
     * @return List of UserResponseDTO containing the organization members
     */
    @GetMapping("/v1/user/organizations/{organization_id}/members")
    public ResponseEntity<List<UserResponseDTO>> getOrganizationMembers(
            @PathVariable("organization_id") String organizationId,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "per_page", required = false) Integer perPage,
            @RequestParam(value = "fields", required = false) String fields,
            @RequestParam(value = "include_fields", required = false) Boolean includeFields) {

        logger.info("Getting members for organization: {} (page: {}, perPage: {}, fields: {})",
                organizationId, page, perPage, fields);

        try {
            List<UserResponseDTO> members = userService.getOrganizationMembers(
                    organizationId, page, perPage, fields, includeFields);

            logger.info("Successfully retrieved {} members for organization {}",
                    members.size(), organizationId);
            return ResponseEntity.ok(members);

        } catch (Exception e) {
            logger.error("Failed to get organization members for organization: {}", organizationId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get organization members with checkpoint pagination
     * Recommended for organizations with more than 1000 members
     *
     * @param organizationId The organization ID
     * @param from           Optional checkpoint ID from which to start selection
     * @param take           Optional number of entries to retrieve (default: 50, max: 100)
     * @param fields         Optional comma-separated list of fields to include
     * @param includeFields  Optional whether to include (true) or exclude (false) specified fields
     * @return OrganizationMembersResponseDTO containing members and pagination info
     */
    @GetMapping("/v1/user/organizations/{organization_id}/members/checkpoint")
    public ResponseEntity<OrganizationMembersResponseDTO> getOrganizationMembersWithCheckpoint(
            @PathVariable("organization_id") String organizationId,
            @RequestParam(value = "from", required = false) String from,
            @RequestParam(value = "take", required = false) Integer take,
            @RequestParam(value = "fields", required = false) String fields,
            @RequestParam(value = "include_fields", required = false) Boolean includeFields) {

        logger.info("Getting members for organization: {} using checkpoint pagination (from: {}, take: {}, fields: {})",
                organizationId, from, take, fields);

        try {
            OrganizationMembersResponseDTO response = userService.getOrganizationMembersWithCheckpoint(
                    organizationId, from, take, fields, includeFields);

            int memberCount = response.getUsers() != null ? response.getUsers().size() : 0;
            logger.info("Successfully retrieved {} members for organization {} using checkpoint pagination",
                    memberCount, organizationId);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Failed to get organization members with checkpoint for organization: {}",
                    organizationId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get organization members with roles included
     * This is a convenience endpoint that automatically includes member roles
     *
     * @param organizationId The organization ID
     * @param page           Optional page number (0-based, default: 0)
     * @param perPage        Optional number of users per page (default: 50, max: 100)
     * @return List of UserResponseDTO containing the organization members with roles
     */
    @GetMapping("/v1/user/organizations/{organization_id}/members/with-roles")
    public ResponseEntity<List<UserResponseDTO>> getOrganizationMembersWithRoles(
            @PathVariable("organization_id") String organizationId,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "per_page", required = false) Integer perPage) {

        logger.info("Getting members with roles for organization: {} (page: {}, perPage: {})",
                organizationId, page, perPage);

        try {
            List<UserResponseDTO> members = userService.getOrganizationMembersWithRoles(
                    organizationId, page, perPage);

            logger.info("Successfully retrieved {} members with roles for organization {}",
                    members.size(), organizationId);
            return ResponseEntity.ok(members);

        } catch (Exception e) {
            logger.error("Failed to get organization members with roles for organization: {}",
                    organizationId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }



    /**
     * Get all organization members (handles pagination automatically)
     * Note: For organizations with more than 1000 members, consider using checkpoint pagination
     *
     * @param organizationId The organization ID
     * @param fields         Optional comma-separated list of fields to include
     * @param includeFields  Optional whether to include (true) or exclude (false) specified fields
     * @return List of all UserResponseDTO for the organization
     */
    @GetMapping("/v1/user/organizations/{organization_id}/members/all")
    public ResponseEntity<List<UserResponseDTO>> getAllOrganizationMembers(
            @PathVariable("organization_id") String organizationId,
            @RequestParam(value = "fields", required = false) String fields,
            @RequestParam(value = "include_fields", required = false) Boolean includeFields) {

        logger.info("Getting all members for organization: {} (fields: {})", organizationId, fields);

        try {
            List<UserResponseDTO> allMembers = userService.getAllOrganizationMembers(
                    organizationId, fields, includeFields);

            logger.info("Successfully retrieved {} total members for organization {}",
                    allMembers.size(), organizationId);
            return ResponseEntity.ok(allMembers);

        } catch (Exception e) {
            logger.error("Failed to get all organization members for organization: {}", organizationId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Send invitation to user for organization
     *
     * @param organizationId    The organization ID to invite the user to
     * @param invitationRequest The invitation request details
     * @return InvitationResponseDTO containing the invitation details
     */
    @PostMapping("/v1/user/organizations/{organization_id}/invitations")
    public ResponseEntity<InvitationResponseDTO> sendOrganizationInvitation(
            @PathVariable("organization_id") String organizationId,
            @Valid @RequestBody InvitationRequestDTO invitationRequest) {

        logger.info("Sending invitation to {} for organization: {} by {}",
                invitationRequest.getInvitee().getEmail(), organizationId,
                invitationRequest.getInviter().getName());

        try {
            InvitationResponseDTO response = userService.sendOrganizationInvitation(organizationId, invitationRequest);

            logger.info("Successfully sent invitation with ID: {} to {} for organization {}",
                    response.getId(), invitationRequest.getInvitee().getEmail(), organizationId);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (Exception e) {
            logger.error("Failed to send organization invitation for organization: {}", organizationId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get organization invitations
     *
     * @param organizationId The organization ID
     * @param page           Optional page number (0-based)
     * @param perPage        Optional number of invitations per page (default: 50, max: 100)
     * @param sort           Optional sort field (e.g., "created_at:1" for ascending, "created_at:-1" for descending)
     * @param fields         Optional comma-separated list of fields to include
     * @param includeFields  Optional whether to include or exclude specified fields
     * @return List of InvitationResponseDTO containing the organization invitations
     */
    @GetMapping("/v1/user/organizations/{organization_id}/invitations")
    public ResponseEntity<List<InvitationResponseDTO>> getOrganizationInvitations(
            @PathVariable("organization_id") String organizationId,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "per_page", required = false) Integer perPage,
            @RequestParam(value = "sort", required = false) String sort,
            @RequestParam(value = "fields", required = false) String fields,
            @RequestParam(value = "include_fields", required = false) Boolean includeFields) {

        logger.info("Getting invitations for organization: {} (page: {}, perPage: {}, sort: {})",
                organizationId, page, perPage, sort);

        try {
            List<InvitationResponseDTO> invitations = userService.getOrganizationInvitations(
                    organizationId, page, perPage, sort, fields, includeFields);

            logger.info("Successfully retrieved {} invitations for organization {}",
                    invitations.size(), organizationId);
            return ResponseEntity.ok(invitations);

        } catch (Exception e) {
            logger.error("Failed to get organization invitations for organization: {}", organizationId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get a specific organization invitation by ID
     *
     * @param organizationId The organization ID
     * @param invitationId   The invitation ID
     * @param fields         Optional comma-separated list of fields to include
     * @param includeFields  Optional whether to include or exclude specified fields
     * @return InvitationResponseDTO containing the invitation details
     */
    @GetMapping("/v1/user/organizations/{organization_id}/invitations/{invitation_id}")
    public ResponseEntity<InvitationResponseDTO> getOrganizationInvitation(
            @PathVariable("organization_id") String organizationId,
            @PathVariable("invitation_id") String invitationId,
            @RequestParam(value = "fields", required = false) String fields,
            @RequestParam(value = "include_fields", required = false) Boolean includeFields) {

        logger.info("Getting invitation {} for organization: {}", invitationId, organizationId);

        try {
            InvitationResponseDTO invitation = userService.getOrganizationInvitation(
                    organizationId, invitationId, fields, includeFields);

            logger.info("Successfully retrieved invitation {} for organization {}", invitationId, organizationId);
            return ResponseEntity.ok(invitation);

        } catch (Exception e) {
            logger.error("Failed to get organization invitation {} for organization: {}", invitationId, organizationId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Delete an organization invitation
     *
     * @param organizationId The organization ID
     * @param invitationId   The invitation ID to delete
     * @return Response indicating success or failure
     */
    @DeleteMapping("/v1/user/organizations/{organization_id}/invitations/{invitation_id}")
    public ResponseEntity<Void> deleteOrganizationInvitation(
            @PathVariable("organization_id") String organizationId,
            @PathVariable("invitation_id") String invitationId) {

        logger.info("Deleting invitation {} for organization: {}", invitationId, organizationId);

        try {
            userService.deleteOrganizationInvitation(organizationId, invitationId);

            logger.info("Successfully deleted invitation {} for organization {}", invitationId, organizationId);
            return ResponseEntity.noContent().build();

        } catch (Exception e) {
            logger.error("Failed to delete organization invitation {} for organization: {}", invitationId, organizationId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Assign roles to a user in an organization
     *
     * @param rolesRequest   The roles to assign to the user
     * @return Response indicating success or failure
     */
    @PostMapping("/v1/user/roles")
    public ResponseEntity<Void> assignRolesToOrganizationMember(
            @Valid @RequestBody AssignRolesRequestDTO rolesRequest) {

        logger.info("Assigning {} roles to user {} in organization: {}",
                rolesRequest.getRoles().size(), rolesRequest.getUserId(), rolesRequest.getOrganizationId());

        try {
            userService.assignRolesToOrganizationMember(rolesRequest);

            logger.info("Successfully assigned roles {} to user {} in organization {}",
                    rolesRequest.getRoles(), rolesRequest.getUserId(), rolesRequest.getOrganizationId());
            return ResponseEntity.noContent().build();

        } catch (Exception e) {
            logger.error("Failed to assign roles to user {} in organization: {}", rolesRequest.getUserId(), rolesRequest.getOrganizationId(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/v1/user/roles")
    public ResponseEntity<Void> changeRolesOfOrganizationMember(
            @Valid @RequestBody AssignRolesRequestDTO rolesRequest ) {
        logger.info("Assigning {} roles to user {} in organization: {}",
                rolesRequest.getRoles().size(), rolesRequest.getUserId(), rolesRequest.getOrganizationId());

        try {
            List<String> rolesOfOrganizationMember = userService.getRolesOfOrganizationMember(rolesRequest.getOrganizationId(), rolesRequest.getUserId());

            if (!rolesOfOrganizationMember.isEmpty()) {
                AssignRolesRequestDTO deleteRolesRequest = AssignRolesRequestDTO.builder()
                        .organizationId(rolesRequest.getOrganizationId())
                        .userId(rolesRequest.getUserId())
                        .roles(rolesOfOrganizationMember)
                        .build();
                userService.removeRolesFromOrganizationMember(deleteRolesRequest);

                userService.assignRolesToOrganizationMember(rolesRequest);
            } else {
                userService.assignRolesToOrganizationMember(rolesRequest);
            }

            logger.info("Successfully assigned roles {} to user {} in organization {}",
                    rolesRequest.getRoles(), rolesRequest.getUserId(), rolesRequest.getOrganizationId());
            return ResponseEntity.noContent().build();

        } catch (Exception e) {
            logger.error("Failed to assign roles to user {} in organization: {}", rolesRequest.getUserId(), rolesRequest.getOrganizationId(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }


    /**
     * Remove roles from a user in an organization
     *
     * @param rolesRequest   The roles to remove from the user
     * @return Response indicating success or failure
     */
    @DeleteMapping("/v1/user/roles")
    public ResponseEntity<Void> removeRolesFromOrganizationMember(
            @Valid @RequestBody AssignRolesRequestDTO rolesRequest) {

        logger.info("Removing {} roles from user {} in organization: {}",
                rolesRequest.getRoles().size(), rolesRequest.getUserId(), rolesRequest.getOrganizationId());

        try {
            userService.removeRolesFromOrganizationMember(rolesRequest);

            logger.info("Successfully removed roles {} from user {} in organization {}",
                    rolesRequest.getRoles(), rolesRequest.getUserId(), rolesRequest.getOrganizationId());
            return ResponseEntity.noContent().build();

        } catch (Exception e) {
            logger.error("Failed to remove roles from user {} in organization: {}", rolesRequest.getUserId(), rolesRequest.getOrganizationId(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Block or unblock a user
     *
     * @param action  The action to perform: "block" or "unblock"
     * @param request The request containing the Auth0 user ID
     * @return ResponseEntity with success/failure status and message
     */
    @PutMapping("/v1/user")
    public ResponseEntity<Map<String, String>> blockAndUnblockUser(
            @RequestParam String action,
            @Valid @RequestBody Auth0BlockUnblockUserRequestDTO request) {

        logger.info("Received request to {} the user {}", action, request.getAuth0Id());

        // Validate action parameter
        if (!action.equalsIgnoreCase("block") && !action.equalsIgnoreCase("unblock")) {
            logger.error("Invalid action: {}. Must be 'block' or 'unblock'", action);
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid action. Must be 'block' or 'unblock'"));
        }

        try {
            Map<String, String> result = userService.blockAndUnblockUser(request, action);

            logger.info("Successfully {}ed user {}", action, request.getAuth0Id());
            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            logger.error("Bad request for {}ing user {}: {}", action, request.getAuth0Id(), e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));

        } catch (Exception e) {
            logger.error("Failed to {} user {}: {}", action, request.getAuth0Id(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to " + action + " user: " + e.getMessage()));
        }
    }
}
