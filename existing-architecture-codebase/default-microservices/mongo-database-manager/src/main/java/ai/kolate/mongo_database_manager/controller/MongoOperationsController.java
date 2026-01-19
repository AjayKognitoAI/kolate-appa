package ai.kolate.mongo_database_manager.controller;

import ai.kolate.mongo_database_manager.config.MongoTenantTemplateFactory;
import ai.kolate.mongo_database_manager.dto.GlobalResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for MongoDB operations.
 * Provides generic CRUD operations that are tenant-aware.
 */
@RestController
@RequestMapping("/api/v1/mongo")
@RequiredArgsConstructor
@Slf4j
public class MongoOperationsController {

    private final MongoTenantTemplateFactory mongoTenantTemplateFactory;

    /**
     * Health check endpoint.
     */
    @GetMapping("/health")
    public ResponseEntity<GlobalResponse> health() {
        GlobalResponse response = GlobalResponse.builder()
                .status("SUCCESS")
                .message("MongoDB Database Manager is running")
                .data("OK")
                .build();
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get all collections in the current tenant's database.
     */
    @GetMapping("/collections")
    public ResponseEntity<GlobalResponse> getCollections() {
        try {
            MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
            
            // Get all collection names
            var collections = mongoTemplate.getCollectionNames();
            
            GlobalResponse response = GlobalResponse.builder()
                    .status("SUCCESS")
                    .message("Collections retrieved successfully")
                    .data(collections)
                    .build();
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error retrieving collections", e);
            
            GlobalResponse response = GlobalResponse.builder()
                    .status("ERROR")
                    .message("Failed to retrieve collections: " + e.getMessage())
                    .data(null)
                    .build();
            
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Get all documents from a specific collection.
     */
    @GetMapping("/collections/{collectionName}/documents")
    public ResponseEntity<GlobalResponse> getDocuments(@PathVariable String collectionName) {
        try {
            MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
            
            // Get all documents from the collection
            List<Map> documents = mongoTemplate.findAll(Map.class, collectionName);
            
            GlobalResponse response = GlobalResponse.builder()
                    .status("SUCCESS")
                    .message("Documents retrieved successfully")
                    .data(Map.of(
                            "collectionName", collectionName,
                            "count", documents.size(),
                            "documents", documents
                    ))
                    .build();
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error retrieving documents from collection: {}", collectionName, e);
            
            GlobalResponse response = GlobalResponse.builder()
                    .status("ERROR")
                    .message("Failed to retrieve documents: " + e.getMessage())
                    .data(null)
                    .build();
            
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Insert a document into a specific collection.
     */
    @PostMapping("/collections/{collectionName}/documents")
    public ResponseEntity<GlobalResponse> insertDocument(
            @PathVariable String collectionName,
            @RequestBody Map<String, Object> document) {
        try {
            MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
            
            // Insert the document
            Map<String, Object> savedDocument = mongoTemplate.insert(document, collectionName);
            
            GlobalResponse response = GlobalResponse.builder()
                    .status("SUCCESS")
                    .message("Document inserted successfully")
                    .data(Map.of(
                            "collectionName", collectionName,
                            "insertedDocument", savedDocument
                    ))
                    .build();
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error inserting document into collection: {}", collectionName, e);
            
            GlobalResponse response = GlobalResponse.builder()
                    .status("ERROR")
                    .message("Failed to insert document: " + e.getMessage())
                    .data(null)
                    .build();
            
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Get count of documents in a specific collection.
     */
    @GetMapping("/collections/{collectionName}/count")
    public ResponseEntity<GlobalResponse> getDocumentCount(@PathVariable String collectionName) {
        try {
            MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
            
            // Get document count
            long count = mongoTemplate.count(new Query(), collectionName);
            
            GlobalResponse response = GlobalResponse.builder()
                    .status("SUCCESS")
                    .message("Document count retrieved successfully")
                    .data(Map.of(
                            "collectionName", collectionName,
                            "count", count
                    ))
                    .build();
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting document count for collection: {}", collectionName, e);
            
            GlobalResponse response = GlobalResponse.builder()
                    .status("ERROR")
                    .message("Failed to get document count: " + e.getMessage())
                    .data(null)
                    .build();
            
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Test MongoDB connection for current tenant.
     */
    @GetMapping("/test-connection")
    public ResponseEntity<GlobalResponse> testConnection() {
        try {
            MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
            
            // Test connection by getting database name
            String databaseName = mongoTemplate.getDb().getName();
            
            GlobalResponse response = GlobalResponse.builder()
                    .status("SUCCESS")
                    .message("MongoDB connection test successful")
                    .data(Map.of(
                            "databaseName", databaseName,
                            "connected", true
                    ))
                    .build();
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("MongoDB connection test failed", e);
            
            GlobalResponse response = GlobalResponse.builder()
                    .status("ERROR")
                    .message("MongoDB connection test failed: " + e.getMessage())
                    .data(Map.of("connected", false))
                    .build();
            
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Execute a MongoDB operation with a specific tenant context.
     */
    @PostMapping("/execute-with-tenant/{tenantId}")
    public ResponseEntity<GlobalResponse> executeWithTenant(
            @PathVariable String tenantId,
            @RequestBody Map<String, Object> operation) {
        try {
            String operationType = (String) operation.get("type");
            String collectionName = (String) operation.get("collection");
            
            Object result = mongoTenantTemplateFactory.executeWithTenant(tenantId, mongoTemplate -> {
                switch (operationType) {
                    case "count":
                        return mongoTemplate.count(new Query(), collectionName);
                    case "findAll":
                        return mongoTemplate.findAll(Map.class, collectionName);
                    case "collections":
                        return mongoTemplate.getCollectionNames();
                    default:
                        throw new IllegalArgumentException("Unsupported operation type: " + operationType);
                }
            });
            
            GlobalResponse response = GlobalResponse.builder()
                    .status("SUCCESS")
                    .message("Operation executed successfully with tenant: " + tenantId)
                    .data(result)
                    .build();
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error executing operation with tenant: {}", tenantId, e);
            
            GlobalResponse response = GlobalResponse.builder()
                    .status("ERROR")
                    .message("Failed to execute operation with tenant: " + e.getMessage())
                    .data(null)
                    .build();
            
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
