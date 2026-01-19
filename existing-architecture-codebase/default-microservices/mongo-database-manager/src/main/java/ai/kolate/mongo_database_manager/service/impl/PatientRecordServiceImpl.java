package ai.kolate.mongo_database_manager.service.impl;

import ai.kolate.mongo_database_manager.entity.PatientRecord;
import ai.kolate.mongo_database_manager.repository.PatientRecordRepository;
import ai.kolate.mongo_database_manager.service.PatientRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PatientRecordServiceImpl implements PatientRecordService {

    private final PatientRecordRepository repository;

    @Override
    public PatientRecord createRecord(String projectId, String trialSlug, Map<String, Object> patientData) {
        PatientRecord record = PatientRecord.builder()
                .recordId(UUID.randomUUID().toString())
                .patientData(patientData)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        return repository.saveProfile(projectId, trialSlug, record);
    }

    @Override
    public List<PatientRecord> getAllRecords(String projectId, String trialSlug) {
        return repository.findAll(projectId, trialSlug);
    }

    @Override
    public List<PatientRecord> getRecords(String projectId, String trialSlug, int page, int size) {
        return repository.findAllWithPagination(projectId, trialSlug, page, size);
    }

    @Override
    public long countRecords(String projectId, String trialSlug) {
        return repository.countProfiles(projectId, trialSlug);
    }

    @Override
    public PatientRecord getRecordById(String projectId, String trialSlug, String recordId) {
        return repository.findById(projectId, trialSlug, recordId);
    }

    @Override
    public void deleteRecord(String projectId, String trialSlug, String recordId) {
        repository.deleteById(projectId, trialSlug, recordId);
    }
}

