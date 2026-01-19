package ai.kolate.mongo_database_manager.service;

import ai.kolate.mongo_database_manager.dto.GlobalResponse;
import org.springframework.web.multipart.MultipartFile;

public interface PatientRecordFileService {
    GlobalResponse uploadCsvAndSave(String projectId, String trialSlug, MultipartFile file);
}
