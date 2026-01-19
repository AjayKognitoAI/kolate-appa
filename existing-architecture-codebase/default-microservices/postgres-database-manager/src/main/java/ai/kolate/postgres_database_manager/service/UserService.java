package ai.kolate.postgres_database_manager.service;

import ai.kolate.postgres_database_manager.dto.PageableRequest;
import ai.kolate.postgres_database_manager.dto.PagedResponse;
import ai.kolate.postgres_database_manager.model.User;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service interface for User operations.
 */
public interface UserService {

    /**
     * Create a new user.
     *
     * @param user The user to create
     * @return The created user
     */
    User createUser(User user);

    /**
     * Update an existing user.
     *
     * @param user The user to update
     * @return The updated user
     */
    User updateUser(User user);

    /**
     * Get a user by their ID.
     *
     * @param id The user ID
     * @return Optional containing the user if found
     */
    Optional<User> getUserById(UUID id);

    /**
     * Get a user by their email.
     *
     * @param email The user email
     * @return Optional containing the user if found
     */
    Optional<User> getUserByEmail(String email);

    /**
     * Get a user by their Auth0 ID.
     *
     * @param auth0Id The Auth0 ID
     * @return Optional containing the user if found
     */
    Optional<User> getUserByAuth0Id(String auth0Id);

    /**
     * Get all users in an organization.
     *
     * @param organizationId The organization ID
     * @return List of users in the organization
     */
    List<User> getUsersByOrganizationId(String organizationId);

    /**
     * Get all users in an organization with pagination.
     *
     * @param organizationId The organization ID
     * @param pageableRequest Pagination parameters
     * @return Paginated list of users in the organization
     */
    PagedResponse<User> getUsersByOrganizationIdPaginated(String organizationId, PageableRequest pageableRequest);

    /**
     * Get all users.
     *
     * @return List of all users
     */
    List<User> getAllUsers();

    /**
     * Get all users with pagination.
     *
     * @param pageableRequest Pagination parameters
     * @return Paginated list of all users
     */
    PagedResponse<User> getAllUsersPaginated(PageableRequest pageableRequest);

    /**
     * Delete a user by their ID.
     *
     * @param id The user ID
     */
    void deleteUser(UUID id);

    /**
     * Search users by first name and last name with pagination.
     * Supports partial matching and is case-insensitive.
     *
     * @param firstName The first name to search for (optional)
     * @param lastName The last name to search for (optional)
     * @param pageableRequest Pagination parameters
     * @return Paginated list of users matching the search criteria
     */
    PagedResponse<User> searchUsersByNamePaginated(String firstName, String lastName, PageableRequest pageableRequest);

    /**
     * Search users by a general search term that matches against both first and last names with pagination.
     * Supports partial matching and is case-insensitive.
     *
     * @param searchTerm The search term to match against names
     * @param pageableRequest Pagination parameters
     * @return Paginated list of users matching the search criteria
     */
    PagedResponse<User> searchUsersByFullNamePaginated(String searchTerm, PageableRequest pageableRequest);

    Long userCountByOrganizationId(String organizationId);
}