package ai.kolate.mongo_database_manager.controller;

import ai.kolate.mongo_database_manager.dto.ExecutionRecordDTO;
import ai.kolate.mongo_database_manager.dto.PagedResponse;
import ai.kolate.mongo_database_manager.entity.ExecutionRecord;
import ai.kolate.mongo_database_manager.service.ExecutionRecordService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/mongo-database-manager")
@RequiredArgsConstructor
public class ExecutionRecordController {

    private final ExecutionRecordService executionRecordService;

    @PostMapping("/v1/execution-record/{projectId}/{trialSlug}/record")
    public ResponseEntity<ExecutionRecord> saveExecutionRecord(
            @PathVariable String projectId,
            @PathVariable String trialSlug,
            @RequestBody ExecutionRecordDTO recordDTO,
            @RequestHeader("user-id") String executedBy,
            @RequestHeader("org-id") String orgId) {

        log.info("payload :: {}", recordDTO.getBasePrediction());

        ExecutionRecord record = new ExecutionRecord();
        record.setUserId(recordDTO.getUserId());
        record.setBasePrediction(recordDTO.getBasePrediction());
        record.setBasePatientData(recordDTO.getBasePatientData());
        record.setExecutedBy(executedBy);

        ExecutionRecord savedRecord = executionRecordService.saveRecord(projectId, trialSlug, record);
        return ResponseEntity.ok(savedRecord);
    }

    @GetMapping("/v1/execution-record/{projectId}/{trialSlug}/records")
    public ResponseEntity<PagedResponse<ExecutionRecord>> getExecutionRecords(
            @PathVariable String projectId,
            @PathVariable String trialSlug,
            @RequestHeader("user-id") String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        PagedResponse<ExecutionRecord> response =
                executionRecordService.getPagedRecordsByUserId(projectId, trialSlug, userId, page, size);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/v1/execution-record/{projectId}/{trialSlug}/record/{executionId}")
    public ResponseEntity<ExecutionRecord> getExecutionRecordById(
            @PathVariable String projectId,
            @PathVariable String trialSlug,
            @PathVariable String executionId) {

        ExecutionRecord record = executionRecordService.getRecordById(projectId, trialSlug, executionId);
        return record != null ? ResponseEntity.ok(record) : ResponseEntity.notFound().build();
    }

    @PostMapping("/v1/execution-record/{projectId}/{trialSlug}/records-with-ids")
    public ResponseEntity<List<ExecutionRecord>> getExecutionsRecordsByIds(
            @PathVariable String projectId,
            @PathVariable String trialSlug,
            @RequestBody List<String> executionIds) {
        log.info("payload for execution ids :: {}", executionIds.toString());

        List<ExecutionRecord> records = executionRecordService.getRecordsByIds(projectId, trialSlug, executionIds);
        log.info("result for execution records with ids :: {}", records.toString());
        return ResponseEntity.ok(records);
    }
}
