package ai.kolate.mongo_database_manager.service;

import ai.kolate.mongo_database_manager.entity.PatientRecord;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface PatientRecordService {

    PatientRecord createRecord(String projectId, String trialSlug, Map<String, Object> patientData);

    List<PatientRecord> getAllRecords(String projectId, String trialSlug);

    List<PatientRecord> getRecords(String projectId, String trialSlug, int page, int size);

    long countRecords(String projectId, String trialSlug);

    PatientRecord getRecordById(String projectId, String trialSlug, String recordId);

    void deleteRecord(String projectId, String trialSlug, String recordId);
}
