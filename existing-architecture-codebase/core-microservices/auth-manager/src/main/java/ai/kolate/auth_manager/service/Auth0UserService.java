package ai.kolate.auth_manager.service;

import ai.kolate.auth_manager.config.ValueConfig;
import ai.kolate.auth_manager.dto.AssignRolesRequestDTO;
import ai.kolate.auth_manager.dto.Auth0BlockUnblockUserRequestDTO;
import ai.kolate.auth_manager.dto.Auth0RoleDTO;
import ai.kolate.auth_manager.dto.InvitationRequestDTO;
import ai.kolate.auth_manager.dto.InvitationResponseDTO;
import ai.kolate.auth_manager.dto.OrganizationMembersResponseDTO;
import ai.kolate.auth_manager.dto.UserResponseDTO;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.time.Duration;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class Auth0UserService {
    private static final Logger logger = LoggerFactory.getLogger(Auth0UserService.class);

    private final WebClient webClient;
    private final TokenService tokenService;
    private final ObjectMapper objectMapper;
    private final ValueConfig valueConfig;
    private final Auth0OrganizationService organizationService;

    // Default fields to include when fetching organization members
    // Note: Auth0 organization members API only supports: user_id, email, picture, name, roles
    private static final String DEFAULT_USER_FIELDS = "user_id,email,picture,name";
    private static final String DEFAULT_USER_FIELDS_WITH_ROLES = DEFAULT_USER_FIELDS + ",roles";

    /**
     * Get organization members using offset pagination
     *
     * @param organizationId The organization ID
     * @param page           Page number (0-based)
     * @param perPage        Number of users per page (default: 50, max: 100)
     * @param fields         Comma-separated list of fields to include (optional)
     * @param includeFields  Whether to include or exclude specified fields
     * @return List of UserResponseDTO with the organization members
     */
    public List<UserResponseDTO> getOrganizationMembers(String organizationId,
                                                        Integer page,
                                                        Integer perPage,
                                                        String fields,
                                                        Boolean includeFields) {
        String accessToken = tokenService.getAccessToken();
        String domain = valueConfig.getAuth0Domain();

        try {
            logger.debug("Getting members for organization: {} (page: {}, perPage: {})",
                    organizationId, page, perPage);

            // Build URI with query parameters
            UriComponentsBuilder uriBuilder = UriComponentsBuilder
                    .fromUriString("https://" + domain + "/api/v2/organizations/{id}/members")
                    .uriVariables(java.util.Map.of("id", organizationId));

            if (page != null) {
                uriBuilder.queryParam("page", page);
            }
            if (perPage != null) {
                uriBuilder.queryParam("per_page", perPage);
            }
            if (fields != null && !fields.trim().isEmpty()) {
                uriBuilder.queryParam("fields", fields);
            }
            if (includeFields != null) {
                uriBuilder.queryParam("include_fields", includeFields);
            }

            URI uri = uriBuilder.build().toUri();

            String responseJson = webClient
                    .get()
                    .uri(uri)
                    .headers(headers -> {
                        headers.setBearerAuth(accessToken);
                    })
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            // Parse the JSON response into a list of UserResponseDTO
            TypeReference<List<UserResponseDTO>> typeRef = new TypeReference<List<UserResponseDTO>>() {
            };
            List<UserResponseDTO> members = objectMapper.readValue(responseJson, typeRef);

            logger.debug("Retrieved {} members for organization {}", members.size(), organizationId);
            return members;

        } catch (WebClientResponseException e) {
            logger.error("Error getting organization members: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Failed to get organization members: " + e.getMessage(), e);
        } catch (JsonProcessingException e) {
            logger.error("Error processing JSON for organization members", e);
            throw new RuntimeException("Error processing organization members data", e);
        }
    }

    /**
     * Get organization members using checkpoint pagination
     * Recommended for retrieving more than 1000 members
     *
     * @param organizationId The organization ID
     * @param from           Optional checkpoint ID from which to start selection
     * @param take           Number of entries to retrieve (default: 50, max: 100)
     * @param fields         Comma-separated list of fields to include (optional)
     * @param includeFields  Whether to include or exclude specified fields
     * @return OrganizationMembersResponseDTO with members and pagination info
     */
    public OrganizationMembersResponseDTO getOrganizationMembersWithCheckpoint(String organizationId,
                                                                               String from,
                                                                               Integer take,
                                                                               String fields,
                                                                               Boolean includeFields) {
        String accessToken = tokenService.getAccessToken();
        String domain = valueConfig.getAuth0Domain();

        try {
            logger.debug("Getting members for organization: {} using checkpoint pagination (from: {}, take: {})",
                    organizationId, from, take);

            // Build URI with query parameters for checkpoint pagination
            UriComponentsBuilder uriBuilder = UriComponentsBuilder
                    .fromUriString("https://" + domain + "/api/v2/organizations/{id}/members")
                    .uriVariables(java.util.Map.of("id", organizationId));

            if (from != null && !from.trim().isEmpty()) {
                uriBuilder.queryParam("from", from);
            }
            if (take != null) {
                uriBuilder.queryParam("take", take);
            }
            if (fields != null && !fields.trim().isEmpty()) {
                uriBuilder.queryParam("fields", fields);
            }
            if (includeFields != null) {
                uriBuilder.queryParam("include_fields", includeFields);
            }

            URI uri = uriBuilder.build().toUri();

            String responseJson = webClient
                    .get()
                    .uri(uri)
                    .headers(headers -> {
                        headers.setBearerAuth(accessToken);
                    })
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            // For checkpoint pagination, we need to handle the response differently
            // The response might be a simple array or an object with pagination info
            OrganizationMembersResponseDTO response = new OrganizationMembersResponseDTO();

            try {
                // Try parsing as a list first (simple response)
                TypeReference<List<UserResponseDTO>> typeRef = new TypeReference<List<UserResponseDTO>>() {
                };
                List<UserResponseDTO> members = objectMapper.readValue(responseJson, typeRef);
                response.setUsers(members);
            } catch (JsonProcessingException e) {
                // If that fails, try parsing as an object with pagination info
                response = objectMapper.readValue(responseJson, OrganizationMembersResponseDTO.class);
            }

            logger.debug("Retrieved {} members for organization {} using checkpoint pagination",
                    response.getUsers() != null ? response.getUsers().size() : 0, organizationId);
            return response;

        } catch (WebClientResponseException e) {
            logger.error("Error getting organization members with checkpoint: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Failed to get organization members: " + e.getMessage(), e);
        } catch (JsonProcessingException e) {
            logger.error("Error processing JSON for organization members with checkpoint", e);
            throw new RuntimeException("Error processing organization members data", e);
        }
    }

    /**
     * Get organization members with roles included
     * This is a convenience method that automatically includes roles and basic user info in the response
     *
     * @param organizationId The organization ID
     * @param page           Page number (0-based)
     * @param perPage        Number of users per page (default: 50, max: 100)
     * @return List of UserResponseDTO with roles included
     */
    public List<UserResponseDTO> getOrganizationMembersWithRoles(String organizationId,
                                                                 Integer page,
                                                                 Integer perPage) {
        // Include both user fields and roles
        return getOrganizationMembers(organizationId, page, perPage, DEFAULT_USER_FIELDS_WITH_ROLES, true);
    }

    /**
     * Get all organization members (handles pagination automatically)
     * Note: For organizations with more than 1000 members, consider using checkpoint pagination
     *
     * @param organizationId The organization ID
     * @param fields         Comma-separated list of fields to include (optional)
     * @param includeFields  Whether to include or exclude specified fields
     * @return List of all UserResponseDTO for the organization
     */
    public List<UserResponseDTO> getAllOrganizationMembers(String organizationId,
                                                           String fields,
                                                           Boolean includeFields) {
        List<UserResponseDTO> allMembers = new java.util.ArrayList<>();
        int page = 0;
        int perPage = 100; // Maximum per page
        List<UserResponseDTO> currentPage;

        do {
            currentPage = getOrganizationMembers(organizationId, page, perPage, fields, includeFields);
            allMembers.addAll(currentPage);
            page++;

            logger.debug("Retrieved page {} with {} members (total so far: {})",
                    page, currentPage.size(), allMembers.size());

        } while (currentPage.size() == perPage); // Continue while we get full pages

        logger.info("Retrieved {} total members for organization {}", allMembers.size(), organizationId);
        return allMembers;
    }

    /**
     * Get organization members with full user details
     * This method fetches organization members first, then enriches with full user data
     *
     * @param organizationId The organization ID
     * @param page           Page number (0-based)
     * @param perPage        Number of users per page (default: 50, max: 100)
     * @param includeRoles   Whether to include roles in the response
     * @return List of UserResponseDTO with full user information
     */
    public List<UserResponseDTO> getOrganizationMembersWithFullDetails(String organizationId,
                                                                       Integer page,
                                                                       Integer perPage,
                                                                       boolean includeRoles) {
        // First get basic member info
        String fields = includeRoles ? DEFAULT_USER_FIELDS_WITH_ROLES : DEFAULT_USER_FIELDS;
        List<UserResponseDTO> basicMembers = getOrganizationMembers(organizationId, page, perPage, fields, true);

        // Then enrich with full user details
        return basicMembers.stream()
                .map(member -> enrichUserWithFullDetails(member, includeRoles))
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Enrich a user with full details from the users API
     *
     * @param basicUser    User with basic info from organization members API
     * @param includeRoles Whether to include roles
     * @return UserResponseDTO with full details
     */
    private UserResponseDTO enrichUserWithFullDetails(UserResponseDTO basicUser, boolean includeRoles) {
        if (basicUser.getUserId() == null) {
            return basicUser; // Can't fetch details without user ID
        }

        try {
            String accessToken = tokenService.getAccessToken();
            String domain = valueConfig.getAuth0Domain();

            // Build URI for individual user details
            UriComponentsBuilder uriBuilder = UriComponentsBuilder
                    .fromUriString("https://" + domain + "/api/v2/users/{id}")
                    .uriVariables(java.util.Map.of("id", basicUser.getUserId()));

            // Include all fields for full user details
            String fullUserFields = "user_id,email,picture,name,given_name,family_name,nickname,email_verified,created_at,updated_at,last_login,login_count,user_metadata,app_metadata";
            if (includeRoles) {
                fullUserFields += ",roles";
            }
            uriBuilder.queryParam("fields", fullUserFields);
            uriBuilder.queryParam("include_fields", true);

            URI uri = uriBuilder.build().toUri();

            String responseJson = webClient
                    .get()
                    .uri(uri)
                    .headers(headers -> headers.setBearerAuth(accessToken))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            UserResponseDTO fullUser = objectMapper.readValue(responseJson, UserResponseDTO.class);

            // If we didn't include roles in the individual user call but had them from org members, preserve them
            if (!includeRoles && basicUser.getRoles() != null) {
                fullUser.setRoles(basicUser.getRoles());
            }

            return fullUser;

        } catch (Exception e) {
            logger.warn("Failed to enrich user {} with full details: {}", basicUser.getUserId(), e.getMessage());
            // Return the basic user info if enrichment fails
            return basicUser;
        }
    }

    /**
     * Send invitation to user for organization using Auth0 Management API
     *
     * @param organizationId    The organization ID to invite the user to
     * @param invitationRequest The invitation request details
     * @return InvitationResponseDTO containing the invitation details
     */
    public InvitationResponseDTO sendOrganizationInvitation(String organizationId, InvitationRequestDTO invitationRequest) {
        String accessToken = tokenService.getAccessToken();
        String domain = valueConfig.getAuth0Domain();

        try {
            logger.info("Sending invitation to {} for organization: {} by {}",
                    invitationRequest.getInvitee().getEmail(), organizationId,
                    invitationRequest.getInviter().getName());

//            Add clientId and connectionId to request
            invitationRequest.setClientId(valueConfig.getAuth0AppClientId());
            invitationRequest.setConnectionId(organizationService.getOrganizationConnections(organizationId)
                    .getFirst().getConnectionId());

            // Build the invitation API endpoint URL
            String invitationUrl = "https://" + domain + "/api/v2/organizations/" + organizationId + "/invitations";

            String responseJson = webClient
                    .post()
                    .uri(invitationUrl)
                    .headers(headers -> {
                        headers.setBearerAuth(accessToken);
                        headers.set("Content-Type", "application/json");
                    })
                    .bodyValue(invitationRequest)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            // Parse the JSON response into InvitationResponseDTO
            InvitationResponseDTO response = objectMapper.readValue(responseJson, InvitationResponseDTO.class);

            logger.info("Successfully sent invitation with ID: {} to {} for organization {}",
                    response.getId(), invitationRequest.getInvitee().getEmail(), organizationId);

            return response;

        } catch (WebClientResponseException e) {
            logger.error("Error sending organization invitation: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Failed to send organization invitation: " + e.getMessage(), e);
        } catch (JsonProcessingException e) {
            logger.error("Error processing JSON for organization invitation", e);
            throw new RuntimeException("Error processing organization invitation data", e);
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
    public List<InvitationResponseDTO> getOrganizationInvitations(String organizationId,
                                                                  Integer page,
                                                                  Integer perPage,
                                                                  String sort,
                                                                  String fields,
                                                                  Boolean includeFields) {
        String accessToken = tokenService.getAccessToken();
        String domain = valueConfig.getAuth0Domain();

        try {
            logger.debug("Getting invitations for organization: {} (page: {}, perPage: {})",
                    organizationId, page, perPage);

            // Build URI with query parameters
            UriComponentsBuilder uriBuilder = UriComponentsBuilder
                    .fromUriString("https://" + domain + "/api/v2/organizations/{id}/invitations")
                    .uriVariables(java.util.Map.of("id", organizationId));

            if (page != null) {
                uriBuilder.queryParam("page", page);
            }
            if (perPage != null) {
                uriBuilder.queryParam("per_page", perPage);
            }
            if (sort != null && !sort.trim().isEmpty()) {
                uriBuilder.queryParam("sort", sort);
            }
            if (fields != null && !fields.trim().isEmpty()) {
                uriBuilder.queryParam("fields", fields);
            }
            if (includeFields != null) {
                uriBuilder.queryParam("include_fields", includeFields);
            }

            URI uri = uriBuilder.build().toUri();

            String responseJson = webClient
                    .get()
                    .uri(uri)
                    .headers(headers -> {
                        headers.setBearerAuth(accessToken);
                    })
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            // Parse the JSON response into a list of InvitationResponseDTO
            TypeReference<List<InvitationResponseDTO>> typeRef = new TypeReference<List<InvitationResponseDTO>>() {
            };
            List<InvitationResponseDTO> invitations = objectMapper.readValue(responseJson, typeRef);

            logger.debug("Retrieved {} invitations for organization {}", invitations.size(), organizationId);
            return invitations;

        } catch (WebClientResponseException e) {
            logger.error("Error getting organization invitations: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Failed to get organization invitations: " + e.getMessage(), e);
        } catch (JsonProcessingException e) {
            logger.error("Error processing JSON for organization invitations", e);
            throw new RuntimeException("Error processing organization invitations data", e);
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
    public InvitationResponseDTO getOrganizationInvitation(String organizationId,
                                                           String invitationId,
                                                           String fields,
                                                           Boolean includeFields) {
        String accessToken = tokenService.getAccessToken();
        String domain = valueConfig.getAuth0Domain();

        try {
            logger.debug("Getting invitation {} for organization: {}", invitationId, organizationId);

            // Build URI with query parameters
            UriComponentsBuilder uriBuilder = UriComponentsBuilder
                    .fromUriString("https://" + domain + "/api/v2/organizations/{id}/invitations/{invitation_id}")
                    .uriVariables(java.util.Map.of("id", organizationId, "invitation_id", invitationId));

            if (fields != null && !fields.trim().isEmpty()) {
                uriBuilder.queryParam("fields", fields);
            }
            if (includeFields != null) {
                uriBuilder.queryParam("include_fields", includeFields);
            }

            URI uri = uriBuilder.build().toUri();

            String responseJson = webClient
                    .get()
                    .uri(uri)
                    .headers(headers -> {
                        headers.setBearerAuth(accessToken);
                    })
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            // Parse the JSON response into InvitationResponseDTO
            InvitationResponseDTO invitation = objectMapper.readValue(responseJson, InvitationResponseDTO.class);

            logger.debug("Retrieved invitation {} for organization {}", invitationId, organizationId);
            return invitation;

        } catch (WebClientResponseException e) {
            logger.error("Error getting organization invitation: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Failed to get organization invitation: " + e.getMessage(), e);
        } catch (JsonProcessingException e) {
            logger.error("Error processing JSON for organization invitation", e);
            throw new RuntimeException("Error processing organization invitation data", e);
        }
    }

    /**
     * Delete an organization invitation
     *
     * @param organizationId The organization ID
     * @param invitationId   The invitation ID to delete
     */
    public void deleteOrganizationInvitation(String organizationId, String invitationId) {
        String accessToken = tokenService.getAccessToken();
        String domain = valueConfig.getAuth0Domain();

        try {
            logger.info("Deleting invitation {} for organization: {}", invitationId, organizationId);

            String deleteUrl = "https://" + domain + "/api/v2/organizations/" + organizationId + "/invitations/" + invitationId;

            webClient
                    .delete()
                    .uri(deleteUrl)
                    .headers(headers -> {
                        headers.setBearerAuth(accessToken);
                    })
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();

            logger.info("Successfully deleted invitation {} for organization {}", invitationId, organizationId);

        } catch (WebClientResponseException e) {
            logger.error("Error deleting organization invitation: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Failed to delete organization invitation: " + e.getMessage(), e);
        }
    }

    /**
     * Assign roles to a user in an organization
     *
     * @param rolesRequest   The roles to assign to the user
     */
    public void assignRolesToOrganizationMember(AssignRolesRequestDTO rolesRequest) {
        String accessToken = tokenService.getAccessToken();
        String domain = valueConfig.getAuth0Domain();

        try {

            String assignRolesUrl = "https://" + domain + "/api/v2/organizations/" + rolesRequest.getOrganizationId() +
                                  "/members/" + rolesRequest.getUserId() + "/roles";

            webClient
                    .post()
                    .uri(assignRolesUrl)
                    .headers(headers -> {
                        headers.setBearerAuth(accessToken);
                        headers.set("Content-Type", "application/json");
                    })
                    .bodyValue(Map.of("roles", rolesRequest.getRoles()))
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();

            logger.info("Successfully assigned roles {} to user {} in organization {}",
                    rolesRequest.getRoles(), rolesRequest.getUserId(), rolesRequest.getOrganizationId());

        } catch (WebClientResponseException e) {
            logger.error("Error assigning roles to organization member: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Failed to assign roles to organization member: " + e.getMessage(), e);
        }
    }

    public List<String> getRolesOfOrganizationMember(String organizationId, String userId) {
        String accessToken = tokenService.getAccessToken();
        String domain = valueConfig.getAuth0Domain();

        try {

            String getUserRolesUrl = "https://" + domain + "/api/v2/organizations/" + organizationId +
                    "/members/" + userId + "/roles";

            Auth0RoleDTO[] roles = webClient
                    .get()
                    .uri(getUserRolesUrl)
                    .headers(headers -> {
                        headers.setBearerAuth(accessToken);
                        headers.setContentType(MediaType.APPLICATION_JSON);
                    })
                    .retrieve()
                    .bodyToMono(Auth0RoleDTO[].class)
                    .block();

            List<String> roleIds = roles != null
                    ? Arrays.stream(roles)
                    .map(Auth0RoleDTO::getId)
                    .toList()
                    : Collections.emptyList();

            logger.info("Retrieved {} role ID(s) for user {} in organization {}", roleIds.size(), userId, organizationId);
            return roleIds;

        } catch (WebClientResponseException e) {
            logger.error("Error fetching role IDs: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Failed to fetch role IDs: " + e.getMessage(), e);
        } catch (Exception ex) {
            logger.error("Unexpected error fetching role IDs: {}", ex.getMessage(), ex);
            throw new RuntimeException("Unexpected error fetching role IDs", ex);
        }
    }

    /**
     * Remove roles from a user in an organization
     *
     * @param rolesRequest   The roles to remove from the user
     */
    public void removeRolesFromOrganizationMember(AssignRolesRequestDTO rolesRequest) {
        String accessToken = tokenService.getAccessToken();
        String domain = valueConfig.getAuth0Domain();

        try {

            String removeRolesUrl = "https://" + domain + "/api/v2/organizations/" + rolesRequest.getOrganizationId() +
                                  "/members/" + rolesRequest.getUserId() + "/roles";

            webClient
                    .method(org.springframework.http.HttpMethod.DELETE)
                    .uri(removeRolesUrl)
                    .headers(headers -> {
                        headers.setBearerAuth(accessToken);
                        headers.set("Content-Type", "application/json");
                    })
                    .bodyValue(Map.of("roles", rolesRequest.getRoles()))
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();

            logger.info("Successfully removed roles {} from user {} in organization {}",
                    rolesRequest.getRoles(), rolesRequest.getUserId(), rolesRequest.getOrganizationId());

        } catch (WebClientResponseException e) {
            logger.error("Error removing roles from organization member: status={}, body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Failed to remove roles from organization member: " + e.getMessage(), e);
        }
    }

    /**
     * Block or unblock a user using Auth0 Management API
     *
     * @param request The request containing the Auth0 user ID
     * @param action  The action to perform: "block" or "unblock"
     * @return Map containing the result status and message
     * @throws IllegalArgumentException if the action is invalid
     * @throws RuntimeException if the API call fails
     */
    public Map<String, String> blockAndUnblockUser(Auth0BlockUnblockUserRequestDTO request, String action) {
        logger.info("Attempting to {} user with Auth0 ID: {}", action, request.getAuth0Id());
        String accessToken = tokenService.getAccessToken();
        String domain = valueConfig.getAuth0Domain();

        // Validate inputs
        if (request.getAuth0Id() == null || request.getAuth0Id().trim().isEmpty()) {
            throw new IllegalArgumentException("Auth0 user ID cannot be null or empty");
        }

        if (!action.equalsIgnoreCase("block") && !action.equalsIgnoreCase("unblock")) {
            throw new IllegalArgumentException("Invalid action. Must be 'block' or 'unblock'");
        }

        try {

            // Prepare the request body based on action
            boolean blockUser = action.equalsIgnoreCase("block");
            Map<String, Object> requestBody = Map.of("blocked", blockUser);

            // Build the API URL
            String apiUrl = "https://" + domain + "/api/v2/users/" + request.getAuth0Id();

            // Make the API call using WebClient
            String response = webClient
                    .patch()
                    .uri(apiUrl)
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .bodyValue(requestBody)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, clientResponse -> {
                        return clientResponse.bodyToMono(String.class)
                                .flatMap(errorBody -> {
                                    logger.error("Auth0 API client error ({}): {}", clientResponse.statusCode(), errorBody);
                                    if (clientResponse.statusCode() == HttpStatus.NOT_FOUND) {
                                        return Mono.error(new IllegalArgumentException("User not found with Auth0 ID: " + request.getAuth0Id()));
                                    }
                                    return Mono.error(new RuntimeException("Auth0 API error: " + errorBody));
                                });
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, clientResponse -> {
                        return clientResponse.bodyToMono(String.class)
                                .flatMap(errorBody -> {
                                    logger.error("Auth0 API server error ({}): {}", clientResponse.statusCode(), errorBody);
                                    return Mono.error(new RuntimeException("Auth0 server error: " + errorBody));
                                });
                    })
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            logger.info("Successfully {}ed user {} in Auth0", action, request.getAuth0Id());

            return Map.of(
                    "status", "success",
                    "message", String.format("User %s has been %sed successfully", request.getAuth0Id(), action),
                    "action", action,
                    "auth0_id", request.getAuth0Id()
            );

        } catch (IllegalArgumentException e) {
            // Re-throw validation errors
            throw e;
        } catch (Exception e) {
            logger.error("Failed to {} user {} in Auth0: {}", action, request.getAuth0Id(), e.getMessage(), e);
            throw new RuntimeException("Failed to " + action + " user in Auth0: " + e.getMessage(), e);
        }
    }
}