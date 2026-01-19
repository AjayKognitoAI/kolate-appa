package ai.kolate.mongo_database_manager.repository;

import ai.kolate.mongo_database_manager.config.MongoTenantTemplateFactory;
import ai.kolate.mongo_database_manager.entity.PatientRecord;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;


@Repository
@RequiredArgsConstructor
public class PatientRecordRepository {

    private final MongoTenantTemplateFactory mongoTenantTemplateFactory;

    private String getCollectionName(String projectId, String trialSlug) {
        return "patient_records_" + projectId + "_" + trialSlug;
    }

    public PatientRecord saveProfile(String projectId, String trialSlug, PatientRecord profile) {
        String collectionName = getCollectionName(projectId, trialSlug);
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        return mongoTemplate.save(profile, collectionName);
    }

    public List<PatientRecord> findAll(String projectId, String trialSlug) {
        String collectionName = getCollectionName(projectId, trialSlug);
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();

        return mongoTemplate.findAll(PatientRecord.class, collectionName);
    }

    public List<PatientRecord> findAllWithPagination(String projectId, String trialId, int page, int size) {
        String collectionName = getCollectionName(projectId, trialId);
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();

        Query query = new Query()
                .with(PageRequest.of(page, size));
        return mongoTemplate.find(query, PatientRecord.class, collectionName);
    }

    public long countProfiles(String projectId, String trialId) {
        String collectionName = getCollectionName(projectId, trialId);
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        return mongoTemplate.count(new Query(), collectionName);
    }

    public PatientRecord findById(String projectId, String trialId, String id) {
        String collectionName = getCollectionName(projectId, trialId);
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        return mongoTemplate.findById(id, PatientRecord.class, collectionName);
    }

    public void deleteById(String projectId, String trialId, String id) {
        String collectionName = getCollectionName(projectId, trialId);
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();

        Query query = new Query(Criteria.where("_id").is(id));
        mongoTemplate.remove(query, PatientRecord.class, collectionName);
    }
}
