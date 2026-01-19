package ai.kolate.project_manager.dto.bookmark;

import ai.kolate.project_manager.dto.trial.ExecutionRecord;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookmarkResponseDTO {
    private BookmarkDTO bookmark;
    private ExecutionRecord executionRecord;
}
