package ai.kolate.postgres_database_manager.repository;

import ai.kolate.postgres_database_manager.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * Find a user by their email and organization ID.
     *
     * @param email The email address
     * @param organizationId The organization ID
     * @return Optional containing the user if found
     */
    Optional<User> findByEmailAndOrganizationId(String email, String organizationId);

    /**
     * Find a user by their email.
     *
     * @param email The email address
     * @return Optional containing the user if found
     */
    Optional<User> findByEmail(String email);

    /**
     * Find a user by their Auth0 ID and organization ID.
     *
     * @param auth0Id The Auth0 ID
     * @param organizationId The organization ID
     * @return Optional containing the user if found
     */
    Optional<User> findByAuth0IdAndOrganizationId(String auth0Id, String organizationId);

    /**
     * Find a user by their Auth0 ID.
     *
     * @param auth0Id The Auth0 ID
     * @return Optional containing the user if found
     */
    Optional<User> findByAuth0Id(String auth0Id);

    List<User> findByAuth0IdIn(Collection<String> auth0Ids);

    /**
     * Find all users belonging to a specific organization.
     *
     * @param organizationId The organization ID
     * @return List of users belonging to the organization
     */
    List<User> findByOrganizationId(String organizationId);

    /**
     * Find all users belonging to a specific organization with pagination.
     *
     * @param organizationId The organization ID
     * @param pageable Pagination information
     * @return Page of users belonging to the organization
     */
    Page<User> findByOrganizationId(String organizationId, Pageable pageable);

    /**
     * Search users by first name and last name (case-insensitive) within an organization with pagination.
     * Uses ILIKE for case-insensitive pattern matching.
     *
     * @param firstName The first name to search for (can be partial)
     * @param lastName The last name to search for (can be partial)
     * @param organizationId The organization ID
     * @param pageable Pagination information
     * @return Page of users matching the search criteria
     */
    @Query("SELECT u FROM User u WHERE " +
            "(:firstName IS NULL OR LOWER(u.firstName) LIKE LOWER(CONCAT('%', :firstName, '%'))) AND " +
            "(:lastName IS NULL OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :lastName, '%'))) AND " +
            "u.organizationId = :organizationId")
    Page<User> searchByFirstNameAndLastNameAndOrganizationId(
            @Param("firstName") String firstName,
            @Param("lastName") String lastName,
            @Param("organizationId") String organizationId,
            Pageable pageable);

    /**
     * Search users by full name (combines first and last name search) within an organization with pagination.
     * This method searches across both first name and last name fields.
     *
     * @param searchTerm The search term to look for in both first and last names
     * @param organizationId The organization ID
     * @param pageable Pagination information
     * @return Page of users matching the search criteria
     */
    @Query("SELECT u FROM User u WHERE " +
            "u.organizationId = :organizationId AND " +
            "(LOWER(CONCAT(u.firstName, ' ', u.lastName)) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
            "LOWER(CONCAT(u.lastName, ' ', u.firstName)) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
            "LOWER(u.firstName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
            "LOWER(u.lastName) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<User> searchByFullNameAndOrganizationId(
            @Param("searchTerm") String searchTerm,
            @Param("organizationId") String organizationId,
            Pageable pageable);


    long countByOrganizationId(String organizationId);
}
