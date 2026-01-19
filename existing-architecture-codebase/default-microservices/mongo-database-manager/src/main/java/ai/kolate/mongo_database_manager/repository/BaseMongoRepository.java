package ai.kolate.mongo_database_manager.repository;

import ai.kolate.mongo_database_manager.config.MongoTenantTemplateFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Base repository class for tenant-aware MongoDB operations.
 * This provides common CRUD operations that can be used by any service.
 */
@Repository
@RequiredArgsConstructor
public class BaseMongoRepository {

    private final MongoTenantTemplateFactory mongoTenantTemplateFactory;

    /**
     * Save an entity to the current tenant's database.
     */
    public <T> T save(T entity, String collectionName) {
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        return mongoTemplate.save(entity, collectionName);
    }

    /**
     * Find all entities of a given type from the current tenant's database.
     */
    public <T> List<T> findAll(Class<T> entityClass, String collectionName) {
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        return mongoTemplate.findAll(entityClass, collectionName);
    }

    /**
     * Find an entity by ID from the current tenant's database.
     */
    public <T> Optional<T> findById(String id, Class<T> entityClass, String collectionName) {
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        T entity = mongoTemplate.findById(id, entityClass, collectionName);
        return Optional.ofNullable(entity);
    }

    /**
     * Find entities by a specific field and value.
     */
    public <T> List<T> findBy(String fieldName, Object value, Class<T> entityClass, String collectionName) {
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        Query query = new Query(Criteria.where(fieldName).is(value));
        return mongoTemplate.find(query, entityClass, collectionName);
    }

    /**
     * Update an entity by ID.
     */
    public <T> boolean updateById(String id, Update update, String collectionName) {
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        Query query = new Query(Criteria.where("id").is(id));
        var result = mongoTemplate.updateFirst(query, update, collectionName);
        return result.getModifiedCount() > 0;
    }

    /**
     * Delete an entity by ID from the current tenant's database.
     */
    public boolean deleteById(String id, String collectionName) {
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        Query query = new Query(Criteria.where("id").is(id));
        var result = mongoTemplate.remove(query, collectionName);
        return result.getDeletedCount() > 0;
    }

    /**
     * Count documents in a collection for the current tenant.
     */
    public long count(String collectionName) {
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        return mongoTemplate.count(new Query(), collectionName);
    }

    /**
     * Check if a collection exists for the current tenant.
     */
    public boolean collectionExists(String collectionName) {
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        return mongoTemplate.collectionExists(collectionName);
    }

    /**
     * Execute a custom query with the current tenant's template.
     */
    public <T> List<T> findByQuery(Query query, Class<T> entityClass, String collectionName) {
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        return mongoTemplate.find(query, entityClass, collectionName);
    }

    /**
     * Execute an operation with a specific tenant context.
     */
    public <T> T executeWithTenant(String tenantId, TenantOperation<T> operation) {
        return mongoTenantTemplateFactory.executeWithTenant(tenantId, operation::execute);
    }

    /**
     * Functional interface for tenant-specific operations.
     */
    @FunctionalInterface
    public interface TenantOperation<T> {
        T execute(MongoTemplate mongoTemplate);
    }
}
