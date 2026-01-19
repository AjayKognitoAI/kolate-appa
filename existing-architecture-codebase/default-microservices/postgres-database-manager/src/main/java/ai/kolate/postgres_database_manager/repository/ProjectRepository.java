package ai.kolate.postgres_database_manager.repository;

import ai.kolate.postgres_database_manager.model.Project;
import ai.kolate.postgres_database_manager.model.enums.ProjectStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Project, UUID> {

    /**
     * Find projects by status
     */
    List<Project> findByStatus(ProjectStatus status);

    /**
     * Find projects by status with pagination
     */
    Page<Project> findByStatus(ProjectStatus status, Pageable pageable);

    /**
     * Find project by name (case-insensitive)
     */
    Optional<Project> findByNameIgnoreCase(String name);

    /**
     * Check if project exists by name (case-insensitive)
     */
    boolean existsByNameIgnoreCase(String name);

    /**
     * Find projects created by a specific user
     */
    List<Project> findByCreatedBy(String createdBy);

    /**
     * Find projects created by a specific user with pagination
     */
    Page<Project> findByCreatedBy(String createdBy, Pageable pageable);

    /**
     * Find projects created within a date range
     */
    @Query("SELECT p FROM Project p WHERE p.createdAt BETWEEN :startDate AND :endDate")
    List<Project> findProjectsCreatedBetween(@Param("startDate") OffsetDateTime startDate, 
                                           @Param("endDate") OffsetDateTime endDate);

    /**
     * Find projects by name containing (case-insensitive) with pagination
     */
    Page<Project> findByNameContainingIgnoreCase(String namePattern, Pageable pageable);

    /**
     * Find projects by description containing (case-insensitive)
     */
    List<Project> findByDescriptionContainingIgnoreCase(String descriptionPattern);

    /**
     * Find projects that a specific user is associated with (through ProjectUser)
     */
    @Query("SELECT DISTINCT p FROM Project p " +
           "JOIN p.projectUsers pu " +
           "WHERE pu.user.auth0Id = :userAuth0Id")
    List<Project> findProjectsByUserAuth0Id(@Param("userAuth0Id") String userAuth0Id);

    /**
     * Find projects that a specific user is associated with, filtered by role
     */
//    @Query("SELECT DISTINCT p FROM Project p " +
//           "JOIN p.projectUsers pu " +
//           "WHERE pu.user.auth0Id = :userAuth0Id AND pu.role = :role")
//    List<Project> findProjectsByUserAuth0IdAndRole(@Param("userAuth0Id") String userAuth0Id,
//                                                  @Param("role") ai.kolate.postgres_database_manager.model.enums.ProjectRole role);

    /**
     * Find projects with their user count
     */
    @Query("SELECT p, COUNT(pu) as userCount FROM Project p " +
           "LEFT JOIN p.projectUsers pu " +
           "GROUP BY p")
    List<Object[]> findProjectsWithUserCount();

    /**
     * Count projects by status
     */
    long countByStatus(ProjectStatus status);

    /**
     * Count projects created by a specific user
     */
    long countByCreatedBy(String createdBy);
}
