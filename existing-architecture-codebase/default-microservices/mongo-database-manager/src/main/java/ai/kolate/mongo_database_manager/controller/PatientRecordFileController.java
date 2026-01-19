package ai.kolate.mongo_database_manager.controller;

import ai.kolate.mongo_database_manager.dto.GlobalResponse;
import ai.kolate.mongo_database_manager.service.PatientRecordFileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/mongo-database-manager")
@RequiredArgsConstructor
public class PatientRecordFileController {

    private final PatientRecordFileService patientRecordFileService;

    @PostMapping("/v1/patient-record/{projectId}/{trialSlug}/upload")
    public ResponseEntity<GlobalResponse> uploadCsv(
            @PathVariable String projectId,
            @PathVariable String trialSlug,
            @RequestParam("file") MultipartFile file) {
        GlobalResponse response = patientRecordFileService.uploadCsvAndSave(projectId, trialSlug, file);
        return ResponseEntity.ok(response);
    }
}
