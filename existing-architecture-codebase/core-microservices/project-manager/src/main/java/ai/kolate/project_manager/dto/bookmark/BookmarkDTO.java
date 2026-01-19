package ai.kolate.project_manager.dto.bookmark;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookmarkDTO {
    private UUID bookmarkId;
    private String bookmarkedBy;
    private UUID projectId;
    private String trialSlug;
    private String executionId;
    private Instant bookmarkedAt;
}
