package ai.kolate.mongo_database_manager.service.impl;

import ai.kolate.mongo_database_manager.dto.GlobalResponse;
import ai.kolate.mongo_database_manager.entity.PatientRecord;
import ai.kolate.mongo_database_manager.repository.PatientRecordRepository;
import ai.kolate.mongo_database_manager.service.PatientRecordFileService;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PatientRecordFileServiceImpl implements PatientRecordFileService {

    private final PatientRecordRepository patientRecordRepository;

    @Override
    public GlobalResponse uploadCsvAndSave(String projectId, String trialSlug, MultipartFile file) {
        List<PatientRecord> savedRecords = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()));
             CSVReader csvReader = new CSVReader(reader)) {

            // read header
            String[] header = csvReader.readNext();
            if (header == null) {
                throw new IllegalArgumentException("CSV file is empty!");
            }

            String[] row;
            while ((row = csvReader.readNext()) != null) {
                Map<String, Object> patientData = new LinkedHashMap<>();

                for (int i = 0; i < header.length; i++) {
                    patientData.put(header[i], row[i]);
                }

                PatientRecord record = PatientRecord.builder()
                        .recordId(UUID.randomUUID().toString())
                        .patientData(patientData)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();

                savedRecords.add(patientRecordRepository.saveProfile(projectId, trialSlug, record));
            }

        } catch (IOException | CsvValidationException e) {
            throw new RuntimeException("Failed to process CSV file", e);
        }

        return GlobalResponse.builder()
                .status("success")
                .message(savedRecords.size() + " patient records uploaded successfully")
                .data(savedRecords)
                .build();
    }
}
