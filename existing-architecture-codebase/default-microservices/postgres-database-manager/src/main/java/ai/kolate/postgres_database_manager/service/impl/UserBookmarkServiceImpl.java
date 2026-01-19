package ai.kolate.postgres_database_manager.service.impl;

import ai.kolate.postgres_database_manager.dto.PagedResponse;
import ai.kolate.postgres_database_manager.model.UserBookmark;
import ai.kolate.postgres_database_manager.repository.UserBookmarkRepository;
import ai.kolate.postgres_database_manager.service.UserBookmarkService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserBookmarkServiceImpl implements UserBookmarkService {

    private final UserBookmarkRepository userBookmarkRepository;

    @Override
    public PagedResponse<UserBookmark> getAllByUserIdAndProjectIdAndTrialSlug(String userId, UUID projectId, String trialSlug, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<UserBookmark> bookmarkPage = userBookmarkRepository.findAllByBookmarkedByAndProjectIdAndTrialSlugOrderByBookmarkedAtDesc(userId, projectId, trialSlug, pageable);
        return new PagedResponse<>(
                bookmarkPage.getContent(),
                bookmarkPage.getNumber(),          // page
                bookmarkPage.getSize(),            // size
                bookmarkPage.getTotalElements(),
                bookmarkPage.getTotalPages(),
                bookmarkPage.isFirst(),
                bookmarkPage.isLast(),
                bookmarkPage.getNumberOfElements(),
                bookmarkPage.isEmpty()
        );
    }

    @Override
    public UserBookmark createBookmark(UserBookmark userBookmark) {
        userBookmark.setBookmarkedAt(Instant.now());
        return userBookmarkRepository.save(userBookmark);
    }

    @Override
    public void deleteBookmark(UUID bookmarkId) {
        userBookmarkRepository.deleteById(bookmarkId);
    }

    @Override
    public UserBookmark getBookmark(String userId, UUID projectId, String trialSlug, String executionId) {
        return userBookmarkRepository.findByBookmarkedByAndProjectIdAndTrialSlugAndExecutionId(userId, projectId, trialSlug, executionId).orElse(null);
    }
}
