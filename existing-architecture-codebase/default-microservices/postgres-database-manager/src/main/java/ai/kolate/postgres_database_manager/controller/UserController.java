package ai.kolate.postgres_database_manager.controller;

import ai.kolate.postgres_database_manager.config.DatasourceContext;
import ai.kolate.postgres_database_manager.dto.PageableRequest;
import ai.kolate.postgres_database_manager.dto.PagedResponse;
import ai.kolate.postgres_database_manager.model.User;
import ai.kolate.postgres_database_manager.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for user management operations.
 * Handles HTTP requests for user CRUD operations with tenant awareness.
 */
@RestController
@RequestMapping("/internal/postgres-database-manager")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;
    private final DatasourceContext datasourceContext;

    /**
     * Create a new user.
     *
     * @param user The user data
     * @return The created user
     */
    @PostMapping("/v1/user")
    public ResponseEntity<User> createUser(@RequestBody User user) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to create user with email: {} for tenant: {}", user.getEmail(), tenantId);

        // Ensure user has the correct organization ID (tenant ID)
        user.setOrganizationId(tenantId);

        User createdUser = userService.createUser(user);
        return new ResponseEntity<>(createdUser, HttpStatus.CREATED);
    }

    /**
     * Update an existing user.
     *
     * @param id   The user ID
     * @param user The updated user data
     * @return The updated user or 404 if not found
     */
    @PutMapping("/v1/user/{id}")
    public ResponseEntity<User> updateUser(@PathVariable String id, @RequestBody User user) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to update user with ID: {} for tenant: {}", id, tenantId);

        try {
            // The service will verify tenant access and set the correct tenant ID
            return userService.getUserByAuth0Id(id)
                    .map(existingUser -> {
                        // The service will enforce the correct tenant ID
                        User updatedUser = userService.updateUser(user);
                        return new ResponseEntity<>(updatedUser, HttpStatus.OK);
                    })
                    .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
        } catch (IllegalArgumentException e) {
            log.warn("Tenant access violation: {}", e.getMessage());
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }
    }

    /**
     * Get a user by ID.
     *
     * @param id The user ID
     * @return The user or 404 if not found
     */
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable UUID id) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get user with ID: {} for tenant: {}", id, tenantId);

        // Service will filter by tenant
        return userService.getUserById(id)
                .map(user -> new ResponseEntity<>(user, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    /**
     * Get a user by email.
     *
     * @param email The user email
     * @return The user or 404 if not found
     */
    @GetMapping("/email/{email}")
    public ResponseEntity<User> getUserByEmail(@PathVariable String email) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get user with email: {} for tenant: {}", email, tenantId);

        // Service will filter by tenant
        return userService.getUserByEmail(email)
                .map(user -> new ResponseEntity<>(user, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    /**
     * Get a user by Auth0 ID.
     *
     * @param auth0Id The Auth0 ID
     * @return The user or 404 if not found
     */
    @GetMapping("/v1/user/{auth0Id}")
    public ResponseEntity<User> getUserByAuth0Id(@PathVariable String auth0Id) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get user with Auth0 ID: {} for tenant: {}", auth0Id, tenantId);

        // Service will filter by tenant
        return userService.getUserByAuth0Id(auth0Id)
                .map(user -> new ResponseEntity<>(user, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    /**
     * Get all users in the current tenant's organization with pagination.
     * The organizationId parameter must match the current tenant.
     *
     * @param organizationId The organization ID
     * @param page           Page number (0-based, default: 0)
     * @param size           Number of items per page (default: 20, max: 100)
     * @param sortBy         Field to sort by (optional)
     * @param sortDirection  Sort direction - ASC or DESC (default: ASC)
     * @return Paginated list of users in the organization or 403 if tenant mismatch
     */
    @GetMapping("v1/users/{organizationId}/organization")
    public ResponseEntity<PagedResponse<User>> getUsersByOrganizationId(
            @PathVariable String organizationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection) {

        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get paginated users for organization: {} from tenant: {} - page: {}, size: {}",
                organizationId, tenantId, page, size);

        // Verify that the requested organization matches the current tenant
        if (!tenantId.equals(organizationId)) {
            log.warn("Tenant mismatch: requested org {} from tenant {}", organizationId, tenantId);
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }

        PageableRequest pageableRequest = PageableRequest.builder()
                .page(page)
                .size(size)
                .sortBy(sortBy)
                .sortDirection(sortDirection)
                .build();

        PagedResponse<User> users = userService.getUsersByOrganizationIdPaginated(organizationId, pageableRequest);
        return new ResponseEntity<>(users, HttpStatus.OK);
    }

    /**
     * Get all users in the current tenant's organization (legacy endpoint - non-paginated).
     * The organizationId parameter must match the current tenant.
     *
     * @param organizationId The organization ID
     * @return List of users in the organization or 403 if tenant mismatch
     * @deprecated Use the paginated version instead: GET /v1/user/{organizationId}/organization with pagination parameters
     */
    @GetMapping("v1/user/{organizationId}/organization/legacy")
    @Deprecated
    public ResponseEntity<List<User>> getUsersByOrganizationIdLegacy(@PathVariable String organizationId) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get users for organization: {} from tenant: {} (legacy endpoint)", organizationId, tenantId);

        // Verify that the requested organization matches the current tenant
        if (!tenantId.equals(organizationId)) {
            log.warn("Tenant mismatch: requested org {} from tenant {}", organizationId, tenantId);
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }

        List<User> users = userService.getUsersByOrganizationId(organizationId);
        return new ResponseEntity<>(users, HttpStatus.OK);
    }

    /**
     * Get all users in the current tenant's organization with pagination.
     *
     * @param page          Page number (0-based, default: 0)
     * @param size          Number of items per page (default: 20, max: 100)
     * @param sortBy        Field to sort by (optional)
     * @param sortDirection Sort direction - ASC or DESC (default: ASC)
     * @return Paginated list of users in the current tenant
     */
    @GetMapping("/v1/users")
    public ResponseEntity<PagedResponse<User>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection) {

        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get all paginated users for tenant: {} - page: {}, size: {}",
                tenantId, page, size);

        PageableRequest pageableRequest = PageableRequest.builder()
                .page(page)
                .size(size)
                .sortBy(sortBy)
                .sortDirection(sortDirection)
                .build();

        // Service will filter by tenant
        PagedResponse<User> users = userService.getAllUsersPaginated(pageableRequest);
        return new ResponseEntity<>(users, HttpStatus.OK);
    }

    /**
     * Get all users in the current tenant's organization (legacy endpoint - non-paginated).
     *
     * @return List of users in the current tenant
     * @deprecated Use the paginated version instead: GET /v1/user/all with pagination parameters
     */
    @GetMapping("/v1/user/all/legacy")
    @Deprecated
    public ResponseEntity<List<User>> getAllUsersLegacy() {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get all users for tenant: {} (legacy endpoint)", tenantId);

        // Service will filter by tenant
        List<User> users = userService.getAllUsers();
        return new ResponseEntity<>(users, HttpStatus.OK);
    }

    /**
     * Delete a user.
     *
     * @param id The user ID
     * @return 204 No Content on success, 404 if not found, 403 if tenant mismatch
     */
    @DeleteMapping("/v1/user/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID id) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to delete user with ID: {} from tenant: {}", id, tenantId);

        try {
            // Service will verify tenant access
            if (userService.getUserById(id).isPresent()) {
                userService.deleteUser(id);
                return new ResponseEntity<>(HttpStatus.NO_CONTENT);
            } else {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
        } catch (IllegalArgumentException e) {
            log.warn("Tenant access violation: {}", e.getMessage());
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }
    }

    /**
     * Search users by first name and/or last name with pagination.
     * At least one of firstName or lastName must be provided.
     *
     * @param firstName     First name to search for (optional, supports partial matching)
     * @param lastName      Last name to search for (optional, supports partial matching)
     * @param page          Page number (0-based, default: 0)
     * @param size          Number of items per page (default: 20, max: 100)
     * @param sortBy        Field to sort by (optional)
     * @param sortDirection Sort direction - ASC or DESC (default: ASC)
     * @return Paginated list of users matching the search criteria
     */
//    @GetMapping("/v1/users/search")
//    public ResponseEntity<PagedResponse<User>> searchUsersByName(
//            @RequestParam(required = false) String firstName,
//            @RequestParam(required = false) String lastName,
//            @RequestParam(defaultValue = "0") int page,
//            @RequestParam(defaultValue = "20") int size,
//            @RequestParam(required = false) String sortBy,
//            @RequestParam(defaultValue = "ASC") String sortDirection) {
//
//        String tenantId = datasourceContext.getTenantId();
//        log.info("Received request to search users by name - firstName: {}, lastName: {} for tenant: {} - page: {}, size: {}",
//                firstName, lastName, tenantId, page, size);
//
//        // Validate that at least one search parameter is provided
//        if ((firstName == null || firstName.trim().isEmpty()) &&
//                (lastName == null || lastName.trim().isEmpty())) {
//            log.warn("Search request with no valid search parameters");
//            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
//        }
//
//        PageableRequest pageableRequest = PageableRequest.builder()
//                .page(page)
//                .size(size)
//                .sortBy(sortBy)
//                .sortDirection(sortDirection)
//                .build();
//
//        PagedResponse<User> users = userService.searchUsersByNamePaginated(firstName, lastName, pageableRequest);
//        return new ResponseEntity<>(users, HttpStatus.OK);
//    }

    /**
     * Search users by a general search term that matches against both first and last names with pagination.
     * The search term will be matched against first name, last name, and full name combinations.
     *
     * @param q             Search query/term (required)
     * @param page          Page number (0-based, default: 0)
     * @param size          Number of items per page (default: 20, max: 100)
     * @param sortBy        Field to sort by (optional)
     * @param sortDirection Sort direction - ASC or DESC (default: ASC)
     * @return Paginated list of users matching the search criteria
     */
    @GetMapping("/v1/users/search")
    public ResponseEntity<PagedResponse<User>> searchUsersByFullName(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection) {

        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to search users by full name - query: {} for tenant: {} - page: {}, size: {}",
                q, tenantId, page, size);

        // Validate search query
        if (q == null || q.trim().isEmpty()) {
            log.warn("Search request with empty query parameter");
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }

        PageableRequest pageableRequest = PageableRequest.builder()
                .page(page)
                .size(size)
                .sortBy(sortBy)
                .sortDirection(sortDirection)
                .build();

        PagedResponse<User> users = userService.searchUsersByFullNamePaginated(q, pageableRequest);
        return new ResponseEntity<>(users, HttpStatus.OK);
    }

    @GetMapping("/v1/users/get-count")
    public ResponseEntity<Long> getUsersCountByOrganization() {

        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get count all of the user from organization with :{}", tenantId);

        Long usersCount = userService.userCountByOrganizationId(tenantId);
        return new ResponseEntity<>(usersCount, HttpStatus.OK);
    }
}
