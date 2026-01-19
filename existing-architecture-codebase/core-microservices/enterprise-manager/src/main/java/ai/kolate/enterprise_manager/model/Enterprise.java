package ai.kolate.enterprise_manager.model;

import ai.kolate.enterprise_manager.model.enums.EnterpriseStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "enterprises", indexes = {
        @Index(name = "enterprises_organization_id_index", columnList = "organization_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Enterprise {

    @Id
    @UuidGenerator
    @Column(name = "enterprise_id")
    private UUID id;

    @Column(name = "organization_id")
    private String organizationId;

    @Column(name = "enterprise_name")
    private String name;

    @Column(name = "enterprise_url")
    private String url;

    @Column(name = "enterprise_domain")
    private String domain;

    @Column(name = "enterprise_description")
    private String description;

    @Column(name = "enterprise_logo_url")
    private String logoUrl;

    @Column(name = "enterprise_admin_email")
    private String adminEmail;

    @Column(name = "enterprise_zip_code")
    private String zipCode;

    @Column(name = "enterprise_region")
    private String region;

    @Column(name = "enterprise_size")
    private String size;

    @Column(name = "enterprise_contact_number")
    private String contactNumber;

    @Column(name = "enterprise_status")
    @Enumerated(EnumType.STRING)
    private EnterpriseStatus status;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "enterprise", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Admin> admins;

    @OneToOne(mappedBy = "enterprise", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private EnterpriseOnboardingProgress onboard;
}
