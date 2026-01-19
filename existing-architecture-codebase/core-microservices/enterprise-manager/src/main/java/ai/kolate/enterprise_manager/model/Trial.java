package ai.kolate.enterprise_manager.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "trials",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_module_trial_name",
                        columnNames = {"module_id", "name"}
                )
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(exclude = {"enterpriseModuleAccesses"})
@ToString(exclude = {"enterpriseModuleAccesses"})
public class Trial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_id", nullable = false)
    private Module module;

    @Column(name = "slug", nullable = false, unique = true, length = 100)
    private String slug;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "iconUrl", columnDefinition = "TEXT")
    private String iconUrl;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Relationships
    @OneToMany(mappedBy = "trial", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<EnterpriseModuleAccess> enterpriseModuleAccesses;
}
