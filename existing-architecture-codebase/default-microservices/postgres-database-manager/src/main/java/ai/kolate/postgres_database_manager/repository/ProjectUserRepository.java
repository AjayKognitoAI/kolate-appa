package ai.kolate.postgres_database_manager.repository;

import ai.kolate.postgres_database_manager.dto.project.UserProjectRoleDTO;
import ai.kolate.postgres_database_manager.model.ProjectUser;
import ai.kolate.postgres_database_manager.model.ProjectUserId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectUserRepository extends JpaRepository<ProjectUser, ProjectUserId> {

    /**
     * Find all users for a specific project
     */
    @Query("SELECT pu FROM ProjectUser pu " +
           "JOIN FETCH pu.user u " +
           "WHERE pu.id.projectId = :projectId")
    List<ProjectUser> findByProjectId(@Param("projectId") UUID projectId);

    /**
     * Find all projects for a specific user
     */
    @Query("SELECT pu FROM ProjectUser pu " +
           "JOIN FETCH pu.project p " +
           "WHERE pu.id.userAuth0Id = :userAuth0Id")
    List<ProjectUser> findByUserAuth0Id(@Param("userAuth0Id") String userAuth0Id);

    /**
     * Find project-user relationship by composite key
     */
    Optional<ProjectUser> findById(ProjectUserId id);


    /**
     * Check if user exists in project
     */
    boolean existsById(ProjectUserId id);


    /**
     * Count users in a project
     */
    long countByIdProjectId(UUID projectId);

    /**
     * Count projects for a user
     */
    long countByIdUserAuth0Id(String userAuth0Id);

    /**
     * Find all admins of a project
     */
    @Query("SELECT pu FROM ProjectUser pu " +
           "JOIN FETCH pu.user u " +
           "WHERE pu.id.projectId = :projectId AND pu.role.name = 'ADMIN'")
    List<ProjectUser> findProjectAdmins(@Param("projectId") UUID projectId);

    /**
     * Find all managers of a project
     */
    @Query("SELECT pu FROM ProjectUser pu " +
           "JOIN FETCH pu.user u " +
           "WHERE pu.id.projectId = :projectId AND pu.role.name = 'MANAGER'")
    List<ProjectUser> findProjectManagers(@Param("projectId") UUID projectId);

    /**
     * Find all members of a project
     */
    @Query("SELECT pu FROM ProjectUser pu " +
           "JOIN FETCH pu.user u " +
           "WHERE pu.id.projectId = :projectId AND pu.role.name = 'MEMBER'")
    List<ProjectUser> findProjectMembers(@Param("projectId") UUID projectId);

    /**
     * Remove user from project
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM ProjectUser pu WHERE pu.id.projectId = :projectId AND pu.id.userAuth0Id = :userAuth0Id")
    void removeUserFromProject(@Param("projectId") UUID projectId, @Param("userAuth0Id") String userAuth0Id);

    /**
     * Remove all users from project
     */
    @Modifying
    @Transactional
    void deleteByIdProjectId(UUID projectId);


    /**
     * Alternative method name for finding users by project ID
     * (Alternative to findByProjectId for compatibility)
     */
    @Query("SELECT pu FROM ProjectUser pu " +
           "JOIN FETCH pu.user u " +
           "WHERE pu.id.projectId = :projectId")
    List<ProjectUser> findByIdProjectId(@Param("projectId") UUID projectId);

    @Query(value = """
    SELECT 
    pu.project_id AS projectId,
    p.name AS projectName,
    r.name AS role,
    r.id AS roleId
    FROM project_users pu
    JOIN projects p ON pu.project_id = p.id
    JOIN roles r ON pu.role_id = r.id
    WHERE pu.user_auth0_id = :userAuth0Id
    """, nativeQuery = true)
    List<UserProjectRoleDTO> findUserProjectRolesNative(@Param("userAuth0Id") String userAuth0Id);

    boolean existsByIdProjectIdAndRoleId(UUID projectId, UUID roleId);

    @Modifying
    @Transactional
    @Query("UPDATE ProjectUser pu SET pu.role.id = :newRoleId " +
            "WHERE pu.id.projectId = :projectId AND pu.role.id = :oldRoleId")
    int updateRoleForUsers(@Param("projectId") UUID projectId,
                           @Param("oldRoleId") UUID oldRoleId,
                           @Param("newRoleId") UUID newRoleId);

}
