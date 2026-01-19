package ai.kolate.enterprise_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Generic DTO for paginated responses.
 *
 * @param <T> The type of content in the page
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagedResponse<T> {

    /**
     * The actual content of the current page.
     */
    private List<T> content;

    /**
     * Current page number (0-based).
     */
    private int page;

    /**
     * Number of items per page.
     */
    private int size;

    /**
     * Total number of elements across all pages.
     */
    private long totalElements;

    /**
     * Total number of pages.
     */
    private int totalPages;

    /**
     * Whether this is the first page.
     */
    private boolean first;

    /**
     * Whether this is the last page.
     */
    private boolean last;

    /**
     * Number of elements in the current page.
     */
    private int numberOfElements;

    /**
     * Whether the page is empty.
     */
    private boolean empty;
}
