package ai.kolate.project_manager.service;


import ai.kolate.project_manager.dto.PagedResponse;
import ai.kolate.project_manager.dto.trial.ShareTrialRequestDTO;
import ai.kolate.project_manager.dto.trial.TrialShareResponseDTO;

public interface TrialService {
    TrialShareResponseDTO createTrialShare(String orgId, String projectId, String trialSlug, ShareTrialRequestDTO request);

    PagedResponse<TrialShareResponseDTO> getTrialShares(
            String projectId,
            String trialSlug,
            String direction,
            String userId,
            int page,
            int size,
            String query
    );
}
