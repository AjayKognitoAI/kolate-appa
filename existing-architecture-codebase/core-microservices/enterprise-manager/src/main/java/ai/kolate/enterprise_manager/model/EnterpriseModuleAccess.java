package ai.kolate.enterprise_manager.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "enterprise_module_access",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_enterprise_module_trial",
                        columnNames = {"enterprise_id", "module_id", "trial_id"}
                )
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnterpriseModuleAccess {

    @Id
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enterprise_id", nullable = false)
    private Enterprise enterprise;

    @Column(name = "organization_id", nullable = false, length = 255)
    private String organizationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_id", nullable = false)
    private Module module;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trial_id")
    private Trial trial;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
