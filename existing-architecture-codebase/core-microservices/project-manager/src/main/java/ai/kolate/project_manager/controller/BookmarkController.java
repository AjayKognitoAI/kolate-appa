package ai.kolate.project_manager.controller;

import ai.kolate.project_manager.dto.bookmark.BookmarkDTO;
import ai.kolate.project_manager.dto.GlobalResponse;
import ai.kolate.project_manager.dto.bookmark.BookmarkRequest;
import ai.kolate.project_manager.model.enums.RequestStatus;
import ai.kolate.project_manager.service.BookmarkService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/project-manager")
@RequiredArgsConstructor
@Slf4j
public class BookmarkController {

    private final BookmarkService bookmarkService;

    @PostMapping("/v1/bookmarks")
    public ResponseEntity<GlobalResponse> createBookmark(@RequestBody BookmarkRequest bookmarkRequest,
                                                         @RequestHeader("user-id") String bookmarkedBy) {
        try {
            log.info("Creating new bookmark");

            BookmarkDTO bookmarkDTO = BookmarkDTO.builder()
                    .projectId(bookmarkRequest.getProjectId())
                    .trialSlug(bookmarkRequest.getTrialSlug())
                    .executionId(bookmarkRequest.getExecutionId())
                    .bookmarkedBy(bookmarkedBy)
                    .bookmarkedAt(Instant.now())
                    .build();

            Object createdBookmark = bookmarkService.createBookmark(bookmarkDTO);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("CREATED")
                    .message("Bookmark created successfully")
                    .data(createdBookmark)
                    .build();

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Failed to create bookmark: {}", e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to create bookmark: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/v1/bookmarks")
    public ResponseEntity<GlobalResponse> getAllBookmarks(
            @RequestParam("project_id") UUID projectId,
            @RequestParam("trial_slug") String trialSlug,
            @RequestHeader("user-id") String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            log.info("Getting all bookmarks for user: {}, project: {}, trial: {}", userId, projectId, trialSlug);
            Object bookmarks = bookmarkService.getAllBookmarks(userId, projectId, trialSlug, page, size);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("SUCCESS")
                    .message("Bookmarks retrieved successfully")
                    .data(bookmarks)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to get bookmarks: {}", e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to get bookmarks: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/v1/bookmarks/bookmarked")
    public ResponseEntity<GlobalResponse> getBookmark(
            @RequestParam("project_id") UUID projectId,
            @RequestParam("trial_slug") String trialSlug,
            @RequestParam("execution_id") String executionId,
            @RequestHeader("user-id") String userId) {
        try {
            BookmarkDTO bookmark = bookmarkService.getBookmark(userId, projectId, trialSlug, executionId);
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("SUCCESS")
                    .message("Bookmark retrieved successfully")
                    .data(bookmark)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to get bookmark: {}", e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to get bookmark: " + e.getMessage())
                    .data(null)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @DeleteMapping("/v1/bookmarks/{bookmarkId}")
    public ResponseEntity<GlobalResponse> deleteBookmark(@PathVariable UUID bookmarkId) {
        try {
            log.info("Deleting bookmark with ID: {}", bookmarkId);
            bookmarkService.deleteBookmark(bookmarkId);

            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.SUCCESS)
                    .status("DELETED")
                    .message("Bookmark deleted successfully")
                    .data(null)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to delete bookmark: {}", e.getMessage());
            GlobalResponse response = GlobalResponse.builder()
                    .state(RequestStatus.FAILED)
                    .status("ERROR")
                    .message("Failed to delete bookmark: " + e.getMessage())
                    .data(null)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
