package ai.kolate.enterprise_manager.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sso_tickets", indexes = {
        @Index(name = "sso_tickets_organization_id_index", columnList = "organization_id"),
        @Index(name = "sso_tickets_admin_email_index", columnList = "admin_email")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SsoTicket {

    @Id
    @UuidGenerator
    @Column(name = "id")
    private UUID id;

    @Column(name = "enterprise_id")
    private UUID enterpriseId;

    @Column(name = "organization_id")
    private String organizationId;

    @Column(name = "admin_email")
    private String adminEmail;

    @Column(name = "sso_ticket_url")
    private String ticketUrl;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}