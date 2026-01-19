package ai.kolate.postgres_database_manager.repository;

import ai.kolate.postgres_database_manager.model.UserBookmark;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserBookmarkRepository extends JpaRepository<UserBookmark, UUID> {
    Page<UserBookmark> findAllByBookmarkedByAndProjectIdAndTrialSlugOrderByBookmarkedAtDesc(String bookmarkedBy, UUID projectId, String trialSlug, Pageable pageable);
    Optional<UserBookmark> findByBookmarkedByAndProjectIdAndTrialSlugAndExecutionId(String bookmarkedBy, UUID projectId, String trialSlug, String executionId);
}
