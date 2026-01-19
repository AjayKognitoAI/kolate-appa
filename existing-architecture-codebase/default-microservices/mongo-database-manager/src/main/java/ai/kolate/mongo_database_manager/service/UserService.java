package ai.kolate.mongo_database_manager.service;

import ai.kolate.mongo_database_manager.config.MongoTenantTemplateFactory;
import ai.kolate.mongo_database_manager.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service for user operations that are tenant-aware.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final MongoTenantTemplateFactory mongoTenantTemplateFactory;
    private static final String COLLECTION_NAME = "users";

    /**
     * Save a user in the current tenant's database.
     *
     * @param user The user to save
     * @return The saved user
     */
    public User saveUser(User user) {
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        User savedUser = mongoTemplate.save(user, COLLECTION_NAME);
        log.info("User saved with ID: {}", savedUser.getId());
        return savedUser;
    }

    /**
     * Find a user by ID in the current tenant's database.
     *
     * @param userId The user ID
     * @return The user, or null if not found
     */
    public User findUserById(String userId) {
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        User user = mongoTemplate.findById(userId, User.class, COLLECTION_NAME);
        log.debug("Found user: {}", user != null ? user.getId() : "null");
        return user;
    }

    /**
     * Find a user by email in the current tenant's database.
     *
     * @param email The user email
     * @return The user, or null if not found
     */
    public User findUserByEmail(String email) {
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        Query query = new Query(Criteria.where("email").is(email));
        User user = mongoTemplate.findOne(query, User.class, COLLECTION_NAME);
        log.debug("Found user by email: {}", user != null ? user.getId() : "null");
        return user;
    }

    /**
     * Find all users in the current tenant's database.
     *
     * @return List of all users
     */
    public List<User> findAllUsers() {
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        List<User> users = mongoTemplate.findAll(User.class, COLLECTION_NAME);
        log.debug("Found {} users", users.size());
        return users;
    }

    /**
     * Delete a user by ID in the current tenant's database.
     *
     * @param userId The user ID
     * @return true if the user was deleted, false otherwise
     */
    public boolean deleteUser(String userId) {
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        Query query = new Query(Criteria.where("id").is(userId));
        User deletedUser = mongoTemplate.findAndRemove(query, User.class, COLLECTION_NAME);
        boolean deleted = deletedUser != null;
        log.info("User {} deleted: {}", userId, deleted);
        return deleted;
    }

    /**
     * Count total users in the current tenant's database.
     *
     * @return Total count of users
     */
    public long countUsers() {
        MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
        long count = mongoTemplate.count(new Query(), User.class, COLLECTION_NAME);
        log.debug("Total users count: {}", count);
        return count;
    }

    /**
     * Save a user in a specific tenant's database.
     *
     * @param tenantId The tenant ID
     * @param user The user to save
     * @return The saved user
     */
    public User saveUserForTenant(String tenantId, User user) {
        return mongoTenantTemplateFactory.executeWithTenant(tenantId, mongoTemplate -> {
            User savedUser = mongoTemplate.save(user, COLLECTION_NAME);
            log.info("User saved with ID: {} for tenant: {}", savedUser.getId(), tenantId);
            return savedUser;
        });
    }

    /**
     * Find all users for a specific tenant.
     *
     * @param tenantId The tenant ID
     * @return List of all users for the tenant
     */
    public List<User> findAllUsersForTenant(String tenantId) {
        return mongoTenantTemplateFactory.executeWithTenant(tenantId, mongoTemplate -> {
            List<User> users = mongoTemplate.findAll(User.class, COLLECTION_NAME);
            log.debug("Found {} users for tenant: {}", users.size(), tenantId);
            return users;
        });
    }
}
