package ai.kolate.project_manager.feignclient;

import ai.kolate.project_manager.dto.bookmark.BookmarkDTO;
import ai.kolate.project_manager.dto.PagedResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.UUID;

@FeignClient(name = "${feign.clients.postgres-database-manager.name}", path = "${feign.clients.postgres-database-manager.path}")
public interface BookmarkManagerClient {

    @PostMapping(path = "/v1/bookmarks", consumes = "application/json", produces = "application/json")
    ResponseEntity<Object> createBookmark(@RequestBody BookmarkDTO bookmarkDTO);

    @GetMapping(path = "/v1/bookmarks", consumes = "application/json", produces = "application/json")
    ResponseEntity<PagedResponse<BookmarkDTO>> getAllByUserIdAndProjectIdAndTrialSlug(
            @RequestParam String userId,
            @RequestParam UUID projectId,
            @RequestParam String trialSlug,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size);

    @DeleteMapping(path = "/v1/bookmarks/{bookmarkId}")
    ResponseEntity<Void> deleteBookmark(@PathVariable UUID bookmarkId);

    @GetMapping(path = "/v1/bookmarks/bookmarked")
    ResponseEntity<BookmarkDTO> getBookmark(
            @RequestParam String userId,
            @RequestParam UUID projectId,
            @RequestParam String trialSlug,
            @RequestParam String executionId);
}
