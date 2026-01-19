package ai.kolate.postgres_database_manager.service;

import ai.kolate.postgres_database_manager.dto.PageableRequest;
import ai.kolate.postgres_database_manager.dto.PagedResponse;
import ai.kolate.postgres_database_manager.dto.trialShare.ShareTrialRequest;
import ai.kolate.postgres_database_manager.dto.trialShare.TrialShareResponse;
import ai.kolate.postgres_database_manager.model.TrialShare;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface TrialShareService {

    TrialShareResponse shareTrialWithTeam(
            UUID projectId,
            String trialSlug,
            ShareTrialRequest request);

    PagedResponse<TrialShareResponse> getTrialShares(
            UUID projectId,
            String trialSlug,
            String userId,
            String direction,
            String q,
            Pageable pageable);
}
