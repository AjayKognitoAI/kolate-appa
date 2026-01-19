package ai.kolate.project_manager.dto.bookmark;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookmarkRequest {
    public UUID projectId;
    public String trialSlug;
    public String executionId;
}
