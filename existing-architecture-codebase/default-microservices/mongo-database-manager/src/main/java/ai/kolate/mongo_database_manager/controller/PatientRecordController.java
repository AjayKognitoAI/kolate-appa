package ai.kolate.mongo_database_manager.controller;

import ai.kolate.mongo_database_manager.entity.PatientRecord;
import ai.kolate.mongo_database_manager.service.PatientRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/mongo-database-manager")
@RequiredArgsConstructor
public class PatientRecordController {

    private final PatientRecordService service;

    @PostMapping("/v1/patient-record/{projectId}/{trialSlug}")
    public ResponseEntity<PatientRecord> createRecord(
            @PathVariable String projectId,
            @PathVariable String trialSlug,
            @RequestBody Map<String, Object> patientData) {
        return ResponseEntity.ok(service.createRecord(projectId, trialSlug, patientData));
    }

    @GetMapping("/v1/patient-record/{projectId}/{trialSlug}/all")
    public ResponseEntity<List<PatientRecord>> getAllRecords(
            @PathVariable String projectId,
            @PathVariable String trialSlug) {
        List<PatientRecord> allRecords = service.getAllRecords(projectId, trialSlug);
        return  ResponseEntity.ok(allRecords);
    }

    @GetMapping("/v1/patient-record/{projectId}/{trialSlug}")
    public ResponseEntity<Map<String, Object>> getRecords(
            @PathVariable String projectId,
            @PathVariable String trialSlug,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        List<PatientRecord> records = service.getRecords(projectId, trialSlug, page, size);
        long total = service.countRecords(projectId, trialSlug);

        Map<String, Object> response = new HashMap<>();
        response.put("records", records);
        response.put("current_page", page);
        response.put("page_size", size);
        response.put("total_records", total);
        response.put("total_pages", (int) Math.ceil((double) total / size));

        return ResponseEntity.ok(response);
    }

    @GetMapping("/v1/patient-record/{projectId}/{trialSlug}/{recordId}")
    public ResponseEntity<PatientRecord> getRecordById(
            @PathVariable String projectId,
            @PathVariable String trialSlug,
            @PathVariable String recordId) {
        return ResponseEntity.ok(service.getRecordById(projectId, trialSlug, recordId));
    }

    @DeleteMapping("/v1/patient-record/{projectId}/{trialSlug}/{recordId}")
    public ResponseEntity<Void> deleteRecord(
            @PathVariable String projectId,
            @PathVariable String trialSlug,
            @PathVariable String recordId) {
        service.deleteRecord(projectId, trialSlug, recordId);
        return ResponseEntity.noContent().build();
    }
}
