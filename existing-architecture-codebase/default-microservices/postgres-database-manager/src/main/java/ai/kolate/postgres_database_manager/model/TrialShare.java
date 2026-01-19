package ai.kolate.postgres_database_manager.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "trial_shares", indexes = {
        @Index(name = "idx_sender_id", columnList = "sender_id"),
        @Index(name = "idx_project_trial", columnList = "project_id, trial_slug"),
        @Index(name = "idx_created_at", columnList = "created_at")
})
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TrialShare {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "project_id", nullable = false)
    @NotNull
    private UUID projectId;


    @Column(name = "trial_slug", nullable = false)
    @NotBlank
    private String trialSlug;

    @Column(name = "execution_id")
    private String executionId;

    @Column(name = "sender_id", nullable = false)
    @NotBlank
    private String senderId;

    // Use Hibernate 6.2+ built-in array support
    @Column(name = "recipients", nullable = false)
    @JdbcTypeCode(SqlTypes.ARRAY)
    @NotEmpty
    private List<String> recipients;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}