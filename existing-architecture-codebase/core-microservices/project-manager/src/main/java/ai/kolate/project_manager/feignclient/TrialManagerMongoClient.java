package ai.kolate.project_manager.feignclient;

import ai.kolate.project_manager.config.FeignClientConfig;
import ai.kolate.project_manager.dto.trial.ExecutionRecord;
import ai.kolate.project_manager.dto.trial.ShareTrialRequestDTO;
import jakarta.validation.Valid;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@FeignClient(name = "${feign.clients.mongo-database-manager.name}",
        path = "${feign.clients.mongo-database-manager.path}",
        configuration = FeignClientConfig.class)
public interface TrialManagerMongoClient {

    @PostMapping("/v1/execution-record/{projectId}/{trialSlug}/records-with-ids")
    List<ExecutionRecord> getExecutionsRecordsByIds(
            @PathVariable String projectId,
            @PathVariable String trialSlug,
            @RequestBody List<String> executionIds);
}
