package ai.kolate.enterprise_manager.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "enterprise_onboard_progress", indexes = {
        @Index(name = "enterprise_onboard_progress_enterprise_id_index", columnList = "enterprise_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnterpriseOnboardingProgress {

    @Id
    @UuidGenerator
    @Column(name = "id")
    private UUID id;

    @Column(name = "organization_id")
    private String organizationId;

    @Column(name = "profile_updated", nullable = false)
    @Builder.Default
    private Boolean profileUpdated = false;

    @Column(name = "invited_member", nullable = false)
    @Builder.Default
    private Boolean invitedMember = false;

    @Column(name = "created_project", nullable = false)
    @Builder.Default
    private Boolean createdProject = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enterprise_id", nullable = false, unique = true)
    private Enterprise enterprise;
}
