package ai.kolate.user_manager.controller;

import ai.kolate.user_manager.dto.ChangeRoleRequestDTO;
import ai.kolate.user_manager.dto.CreateUserRequestDTO;
import ai.kolate.user_manager.dto.GlobalResponse;
import ai.kolate.user_manager.dto.InviteUserRequestDTO;
import ai.kolate.user_manager.dto.InviteUserResponseDTO;
import ai.kolate.user_manager.dto.PagedResponse;
import ai.kolate.user_manager.dto.UserResponseDTO;
import ai.kolate.user_manager.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/user-manager")
@Slf4j
public class UserController {

    private final UserService userService;
    private final HttpServletRequest servletRequest;

    @PostMapping("/v1/user")
    public ResponseEntity<GlobalResponse> createUser(@RequestBody CreateUserRequestDTO request) {
        log.info("Received request to create user with auth0Id: {}", request.getAuth0Id());
        try {
            UserResponseDTO userResponse = userService.createUser(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(GlobalResponse.builder()
                            .status("SUCCESS")
                            .message("User created successfully")
                            .data(userResponse)
                            .build());
        } catch (Exception e) {
            log.error("Error creating user: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(GlobalResponse.builder()
                            .status("ERROR")
                            .message("Failed to create user: " + e.getMessage())
                            .build());
        }
    }

    @GetMapping("/v1/user")
    public ResponseEntity<GlobalResponse> getUserByAuth0Id(@RequestParam("auth0_id") String auth0Id) {
        log.info("Received request to get user with auth0Id: {}", auth0Id);
        try {
            UserResponseDTO userResponse = userService.getUserByAuth0Id(auth0Id);
            return ResponseEntity.ok(GlobalResponse.builder()
                    .status("SUCCESS")
                    .message("User retrieved successfully")
                    .data(userResponse)
                    .build());
        } catch (Exception e) {
            log.error("Error fetching user: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(GlobalResponse.builder()
                            .status("ERROR")
                            .message("Failed to retrieve user: " + e.getMessage())
                            .build());
        }
    }

    @PostMapping("/v1/user/invite")
    public ResponseEntity<GlobalResponse> inviteUser(@Valid @RequestBody InviteUserRequestDTO request) {
        log.info("Received invitation request for user: {}", request.getInviteeEmail());
        try {
            InviteUserResponseDTO response = userService.inviteUserToOrganization(request, servletRequest.getHeader("org-id"));
            return ResponseEntity.ok(GlobalResponse.builder()
                    .status("SUCCESS")
                    .message("User invited successfully")
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("Error inviting user: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(GlobalResponse.builder()
                            .status("ERROR")
                            .message("Failed to invite user: " + e.getMessage())
                            .build());
        }

    }

    @GetMapping("/v1/users/{organizationId}/organization")
    public ResponseEntity<GlobalResponse> getUsersByOrganizationId(
            @PathVariable String organizationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection) {

        log.info("Received request to get users for organization: {} with page: {}, size: {}", organizationId, page, size);

        try {
            PagedResponse<UserResponseDTO> pagedResponse = userService.getUsersByOrganizationId(organizationId, page, size, sortBy, sortDirection);
            return ResponseEntity.ok(GlobalResponse.builder()
                    .status("SUCCESS")
                    .message("Users retrieved successfully for organization")
                    .data(pagedResponse)
                    .build());
        } catch (Exception e) {
            log.error("Error fetching users for organization {}: {}", organizationId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(GlobalResponse.builder()
                            .status("ERROR")
                            .message("Failed to retrieve users for organization: " + e.getMessage())
                            .build());
        }
    }

    @GetMapping("/v1/users")
    public ResponseEntity<GlobalResponse> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection) {

        log.info("Received request to get all users with page: {}, size: {}", page, size);

        try {
            PagedResponse<UserResponseDTO> pagedResponse = userService.getAllUsers(page, size, sortBy, sortDirection);
            return ResponseEntity.ok(GlobalResponse.builder()
                    .status("SUCCESS")
                    .message("All users retrieved successfully")
                    .data(pagedResponse)
                    .build());
        } catch (Exception e) {
            log.error("Error fetching all users: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(GlobalResponse.builder()
                            .status("ERROR")
                            .message("Failed to retrieve all users: " + e.getMessage())
                            .build());
        }
    }

    @GetMapping("/v1/users/roles")
    public ResponseEntity<GlobalResponse> getAllUserDefaultRoles() {
        log.info("Received request to get all user default roles");
        try {
            var roles = userService.getAllRoles();
            return ResponseEntity.ok(GlobalResponse.builder()
                    .status("SUCCESS")
                    .message("Roles retrieved successfully")
                    .data(roles)
                    .build());
        } catch (Exception e) {
            log.error("Error fetching roles: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(GlobalResponse.builder()
                            .status("ERROR")
                            .message("Failed to retrieve roles: " + e.getMessage())
                            .build());
        }
    }

    @PutMapping("/v1/users/roles")
    public ResponseEntity<GlobalResponse> changeUserRoles(@RequestBody ChangeRoleRequestDTO request) {
        log.info("Received request to change role to :: {} for user :: {}", request.getRoleId(), request.getUserId());
        String organizationId = servletRequest.getHeader("org-id");
        userService.changeUserRole(request, organizationId);
        return ResponseEntity.ok(GlobalResponse.builder()
                .status(HttpStatus.OK.toString())
                .message("Roles updated successfully")
                .build());

    }

    @PatchMapping("/v1/users/{auth0Id}")
    public ResponseEntity<GlobalResponse> blockAndUnblockUser(
            @PathVariable String auth0Id,
            @RequestParam String action) {
        log.info("Received request to {} the user {}", action, auth0Id);

        try {
            UserResponseDTO userResponse = userService.blockAndUnblockUser(action, auth0Id);

            String actionPastTense = "block".equalsIgnoreCase(action) ? "blocked" : "unblocked";

            return ResponseEntity.ok(GlobalResponse.builder()
                    .status("SUCCESS")
                    .message("User " + actionPastTense + " successfully")
                    .data(userResponse)
                    .build());

        } catch (IllegalArgumentException e) {
            log.error("Invalid request parameters: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(GlobalResponse.builder()
                            .status("ERROR")
                            .message("Invalid request: " + e.getMessage())
                            .build());

        } catch (Exception e) {
            log.error("Error {}ing user {}: {}", action, auth0Id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(GlobalResponse.builder()
                            .status("ERROR")
                            .message("Failed to " + action + " user: " + e.getMessage())
                            .build());
        }
    }

    @GetMapping("/v1/users/search")
    public ResponseEntity<GlobalResponse> searchUsersByFullName(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection) {

        log.info("Received request to search users by full name with query: '{}', page: {}, size: {}", q, page, size);

        try {
            PagedResponse<UserResponseDTO> pagedResponse = userService.searchUsersByFullName(q, page, size, sortBy, sortDirection);

            return ResponseEntity.ok(GlobalResponse.builder()
                    .status("SUCCESS")
                    .message("Users search completed successfully")
                    .data(pagedResponse)
                    .build());

        } catch (IllegalArgumentException e) {
            log.error("Invalid search parameters: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(GlobalResponse.builder()
                            .status("ERROR")
                            .message("Invalid request: " + e.getMessage())
                            .build());

        } catch (Exception e) {
            log.error("Error searching users by full name with query '{}': {}", q, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(GlobalResponse.builder()
                            .status("ERROR")
                            .message("Failed to search users: " + e.getMessage())
                            .build());
        }
    }




    @GetMapping("/v1/users/get-count")
    public ResponseEntity<GlobalResponse> getUsersCount() {
        log.info("Received request to get all users count");
        try {
            Long count = userService.getUsersCount();
            return ResponseEntity.ok(GlobalResponse.builder()
                    .status("SUCCESS")
                    .message("Users count retrieved successfully")
                    .data(count)
                    .build());
        } catch (Exception e) {
            log.error("Error fetching users count: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(GlobalResponse.builder()
                            .status("ERROR")
                            .message("Failed to retrieve users count: " + e.getMessage())
                            .build());
        }
    }
}
