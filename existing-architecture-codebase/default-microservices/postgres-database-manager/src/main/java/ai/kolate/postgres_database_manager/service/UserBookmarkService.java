package ai.kolate.postgres_database_manager.service;

import ai.kolate.postgres_database_manager.dto.PagedResponse;
import ai.kolate.postgres_database_manager.model.UserBookmark;

import java.util.UUID;

public interface UserBookmarkService {
    PagedResponse<UserBookmark> getAllByUserIdAndProjectIdAndTrialSlug(String userId, UUID projectId, String trialSlug, int page, int size);
    UserBookmark createBookmark(UserBookmark userBookmark);
    void deleteBookmark(UUID bookmarkId);
    UserBookmark getBookmark(String userId, UUID projectId, String trialSlug, String executionId);
}
