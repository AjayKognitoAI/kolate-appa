package ai.kolate.postgres_database_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * DTO for pagination request parameters.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageableRequest {
    
    /**
     * Page number (0-based).
     */
    @Builder.Default
    private int page = 0;
    
    /**
     * Number of items per page.
     */
    @Builder.Default
    private int size = 20;
    
    /**
     * Sort field name.
     */
    private String sortBy;
    
    /**
     * Sort direction (ASC or DESC).
     */
    @Builder.Default
    private String sortDirection = "ASC";

    public Pageable toPageable() {
        if (sortBy != null && !sortBy.isBlank()) {
            Sort.Direction direction = Sort.Direction.fromOptionalString(sortDirection.toUpperCase()).orElse(Sort.Direction.ASC);
            return PageRequest.of(page, size, Sort.by(direction, sortBy));
        } else {
            return PageRequest.of(page, size);
        }
    }
}
