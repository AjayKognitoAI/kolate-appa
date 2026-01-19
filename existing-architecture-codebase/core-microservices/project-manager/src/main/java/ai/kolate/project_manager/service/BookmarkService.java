package ai.kolate.project_manager.service;

import ai.kolate.project_manager.dto.bookmark.BookmarkDTO;
import ai.kolate.project_manager.feignclient.BookmarkManagerClient;
import lombok.RequiredArgsConstructor;
import ai.kolate.project_manager.dto.bookmark.BookmarkResponseDTO;
import ai.kolate.project_manager.dto.bookmark.BookmarkExecutionResponse;
import ai.kolate.project_manager.dto.PagedResponse;
import ai.kolate.project_manager.dto.trial.ExecutionRecord;
import ai.kolate.project_manager.feignclient.TrialManagerMongoClient;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BookmarkService {

    private final BookmarkManagerClient bookmarkManagerClient;
    private final TrialManagerMongoClient trialManagerMongoClient;

    public Object createBookmark(BookmarkDTO bookmarkDTO) {
        return bookmarkManagerClient.createBookmark(bookmarkDTO).getBody();
    }

    public BookmarkExecutionResponse getAllBookmarks(String userId, UUID projectId, String trialSlug, int page, int size) {
        PagedResponse<BookmarkDTO> bookmarksResponse = bookmarkManagerClient.getAllByUserIdAndProjectIdAndTrialSlug(userId, projectId, trialSlug, page, size).getBody();

        if (bookmarksResponse == null || bookmarksResponse.getContent().isEmpty()) {
            return new BookmarkExecutionResponse();
        }

        List<String> executionIds = bookmarksResponse.getContent().stream()
                .map(BookmarkDTO::getExecutionId)
                .collect(Collectors.toList());

        List<ExecutionRecord> executionRecords = trialManagerMongoClient.getExecutionsRecordsByIds(projectId.toString(), trialSlug, executionIds);

        List<BookmarkResponseDTO> bookmarkResponseDTOS = bookmarksResponse.getContent().stream().map(bookmarkDTO -> {
            ExecutionRecord executionRecord = executionRecords.stream()
                    .filter(er -> er.getExecutionId().equals(bookmarkDTO.getExecutionId()))
                    .findFirst()
                    .orElse(null);
            return new BookmarkResponseDTO(bookmarkDTO, executionRecord);
        }).collect(Collectors.toList());

        return new BookmarkExecutionResponse(
                bookmarkResponseDTOS,
                bookmarksResponse.getPage(),
                bookmarksResponse.getSize(),
                bookmarksResponse.getTotalElements(),
                bookmarksResponse.getTotalPages(),
                bookmarksResponse.isFirst(),
                bookmarksResponse.isLast(),
                bookmarksResponse.getNumberOfElements(),
                bookmarksResponse.isEmpty()
        );
    }

    public void deleteBookmark(UUID bookmarkId) {
        bookmarkManagerClient.deleteBookmark(bookmarkId);
    }

    public BookmarkDTO getBookmark(String userId, UUID projectId, String trialSlug, String executionId) {
        return bookmarkManagerClient.getBookmark(userId, projectId, trialSlug, executionId).getBody();
    }
}
