package ai.kolate.postgres_database_manager.repository;

import ai.kolate.postgres_database_manager.model.TrialShare;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface TrialShareRepository extends JpaRepository<TrialShare, UUID> {

    @Query(value = """
            SELECT * FROM trial_shares ts
            WHERE ts.project_id = :projectId
              AND ts.trial_slug = :trialSlug
              AND ts.sender_id = :senderId
            ORDER BY ts.created_at DESC
            """,
            countQuery = """
            SELECT count(*) FROM trial_shares ts
            WHERE ts.project_id = :projectId
              AND ts.trial_slug = :trialSlug
              AND ts.sender_id = :senderId
            """,
            nativeQuery = true)
    Page<TrialShare> findByProjectIdAndTrialSlugAndSenderId(
            @Param("projectId") UUID projectId,
            @Param("trialSlug") String trialSlug,
            @Param("senderId") String senderId,
            Pageable pageable);

    @Query(value = """
            SELECT * FROM trial_shares ts
            WHERE ts.project_id = :projectId
              AND ts.trial_slug = :trialSlug
              AND :userId = ANY(ts.recipients)
            ORDER BY ts.created_at DESC
            """,
            countQuery = """
            SELECT count(*) FROM trial_shares ts
            WHERE ts.project_id = :projectId
              AND ts.trial_slug = :trialSlug
              AND :userId = ANY(ts.recipients)
            """,
            nativeQuery = true)
    Page<TrialShare> findByProjectIdAndTrialSlugAndRecipient(
            @Param("projectId") UUID projectId,
            @Param("trialSlug") String trialSlug,
            @Param("userId") String userId,
            Pageable pageable);

    @Query(value = """
            SELECT ts.* FROM trial_shares ts
            JOIN users u ON u.auth0_id = ANY(ts.recipients)
            WHERE ts.project_id = :projectId
              AND ts.trial_slug = :trialSlug
              AND ts.sender_id = :senderId
              AND (COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') ILIKE CONCAT('%', :q, '%') 
                   OR u.email ILIKE CONCAT('%', :q, '%'))
            ORDER BY ts.created_at DESC
            """,
            countQuery = """
            SELECT count(DISTINCT ts.id) FROM trial_shares ts
            JOIN users u ON u.auth0_id = ANY(ts.recipients)
            WHERE ts.project_id = :projectId
              AND ts.trial_slug = :trialSlug
              AND ts.sender_id = :senderId
              AND (COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') ILIKE CONCAT('%', :q, '%') 
                   OR u.email ILIKE CONCAT('%', :q, '%'))
            """,
            nativeQuery = true)
    Page<TrialShare> searchSentByRecipientNameOrEmail(
            @Param("projectId") UUID projectId,
            @Param("trialSlug") String trialSlug,
            @Param("senderId") String senderId,
            @Param("q") String q,
            Pageable pageable);

    @Query(value = """
            SELECT ts.* FROM trial_shares ts
            JOIN users u ON u.auth0_id = ts.sender_id
            WHERE ts.project_id = :projectId
              AND ts.trial_slug = :trialSlug
              AND :userId = ANY(ts.recipients)
              AND (COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') ILIKE CONCAT('%', :q, '%') 
                   OR u.email ILIKE CONCAT('%', :q, '%'))
            ORDER BY ts.created_at DESC
            """,
            countQuery = """
            SELECT count(*) FROM trial_shares ts
            JOIN users u ON u.auth0_id = ts.sender_id
            WHERE ts.project_id = :projectId
              AND ts.trial_slug = :trialSlug
              AND :userId = ANY(ts.recipients)
              AND (COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') ILIKE CONCAT('%', :q, '%') 
                   OR u.email ILIKE CONCAT('%', :q, '%'))
            """,
            nativeQuery = true)
    Page<TrialShare> searchReceivedBySenderNameOrEmail(
            @Param("projectId") UUID projectId,
            @Param("trialSlug") String trialSlug,
            @Param("userId") String userId,
            @Param("q") String q,
            Pageable pageable);
}
