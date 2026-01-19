package ai.kolate.mongo_database_manager.service;

import ai.kolate.mongo_database_manager.config.MongoTenantTemplateFactory;
import ai.kolate.mongo_database_manager.dto.PagedResponse;
import ai.kolate.mongo_database_manager.entity.ExecutionRecord;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.domain.Sort;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExecutionRecordService {

    private final MongoTenantTemplateFactory mongoTenantTemplateFactory;

    public ExecutionRecord saveRecord(String projectId, String trialSlug, ExecutionRecord record) {
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        String collectionName = projectId + "_" + trialSlug + "_prediction_results";
        record.setExecutedAt(Instant.now());
        record.setUpdatedAt(Instant.now());
        return mongoTemplate.save(record, collectionName);
    }

    public PagedResponse<ExecutionRecord> getPagedRecordsByUserId(
            String projectId, String trialSlug, String userId, int page, int size) {

        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        String collectionName = projectId + "_" + trialSlug + "_prediction_results";

        Query countQuery = new Query();
        countQuery.addCriteria(Criteria.where("userId").is(userId));
        long totalElements = mongoTemplate.count(countQuery, ExecutionRecord.class, collectionName);

        Query query = new Query();
        query.addCriteria(Criteria.where("userId").is(userId));
        query.with(Sort.by(
                Sort.Order.desc("executedAt"),
                Sort.Order.desc("updatedAt")
        ));
        query.skip((long) page * size);
        query.limit(size);

        List<ExecutionRecord> records = mongoTemplate.find(query, ExecutionRecord.class, collectionName);

        int totalPages = (int) Math.ceil((double) totalElements / size);

        return new PagedResponse<>(records, totalElements, totalPages, page, size);
    }

    public List<ExecutionRecord> getAllRecordsByUserId(String projectId, String trialSlug, String userId, int page, int size) {
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        String collectionName = projectId + "_" + trialSlug + "_prediction_results";

        Query query = new Query();
        query.addCriteria(Criteria.where("userId").is(userId));
        query.with(Sort.by(
                Sort.Order.desc("executedAt"),
                Sort.Order.desc("updatedAt")
        ));
        query.skip((long) page * size);
        query.limit(size);

        return mongoTemplate.find(query, ExecutionRecord.class, collectionName);
    }

    public ExecutionRecord getRecordById(String projectId, String trialSlug, String executionId) {
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        String collectionName = projectId + "_" + trialSlug + "_prediction_results";
        return mongoTemplate.findById(executionId, ExecutionRecord.class, collectionName);
    }

    public List<ExecutionRecord> getRecordsByIds(String projectId, String trialSlug, List<String> executionIds) {
        if (executionIds == null || executionIds.isEmpty()) {
            return Collections.emptyList();
        }

        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        String collectionName = projectId + "_" + trialSlug + "_prediction_results";

        Criteria criteria = new Criteria().orOperator(
                Criteria.where("executionId").in(executionIds)
        );

        Query query = new Query(criteria);

        return mongoTemplate.find(query, ExecutionRecord.class, collectionName);
    }
}