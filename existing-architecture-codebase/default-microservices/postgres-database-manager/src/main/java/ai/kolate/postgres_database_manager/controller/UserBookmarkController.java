package ai.kolate.postgres_database_manager.controller;

import ai.kolate.postgres_database_manager.dto.PagedResponse;
import ai.kolate.postgres_database_manager.model.UserBookmark;
import ai.kolate.postgres_database_manager.service.UserBookmarkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/internal/postgres-database-manager/v1/bookmarks")
@RequiredArgsConstructor
public class UserBookmarkController {

    private final UserBookmarkService userBookmarkService;

    @GetMapping
    public ResponseEntity<PagedResponse<UserBookmark>> getAllByUserIdAndProjectIdAndTrialSlug(
            @RequestParam String userId,
            @RequestParam UUID projectId,
            @RequestParam String trialSlug,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PagedResponse<UserBookmark> bookmarks = userBookmarkService.getAllByUserIdAndProjectIdAndTrialSlug(userId, projectId, trialSlug, page, size);
        return ResponseEntity.ok(bookmarks);
    }

    @PostMapping
    public ResponseEntity<UserBookmark> createBookmark(@RequestBody UserBookmark userBookmark) {
        UserBookmark createdBookmark = userBookmarkService.createBookmark(userBookmark);
        return new ResponseEntity<>(createdBookmark, HttpStatus.CREATED);
    }

    @DeleteMapping("/{bookmarkId}")
    public ResponseEntity<Void> deleteBookmark(@PathVariable UUID bookmarkId) {
        userBookmarkService.deleteBookmark(bookmarkId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/bookmarked")
    public ResponseEntity<UserBookmark> getBookmark(
            @RequestParam String userId,
            @RequestParam UUID projectId,
            @RequestParam String trialSlug,
            @RequestParam String executionId) {
        UserBookmark bookmark = userBookmarkService.getBookmark(userId, projectId, trialSlug, executionId);
        return ResponseEntity.ok(bookmark);
    }
}
