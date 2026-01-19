package ai.kolate.mongo_database_manager.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Sample User entity to demonstrate tenant-aware MongoDB operations.
 */
@Document(collection = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    
    @Id
    private String id;
    
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String organizationId; // Tenant identifier
    private boolean active;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Additional fields specific to your business logic
    private String department;
    private String role;
}
