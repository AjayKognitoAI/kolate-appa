package ai.kolate.enterprise_manager.model;

import ai.kolate.enterprise_manager.model.enums.UserType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(name = "admins", indexes = {
        @Index(name = "admins_user_auth0_id_index", columnList = "user_auth0_id"),
        @Index(name = "admins_user_organization_id_index", columnList = "user_organization_id"),
        @Index(name = "admins_user_email_index", columnList = "user_email")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Admin {

    @Id
    @UuidGenerator
    @Column(name = "admin_id")
    private UUID id;

    @Column(name = "user_auth0_id", unique = true)
    private String auth0Id;

    @Column(name = "user_first_name")
    private String firstName;

    @Column(name = "user_last_name")
    private String lastName;

    @Column(name = "user_email", unique = true)
    private String email;

    @Column(name = "user_type")
    @Enumerated(EnumType.STRING)
    private UserType userType;

    @Column(name = "user_organization_id")
    private String organizationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_enterprise_id", referencedColumnName = "enterprise_id", nullable = false)
    @JsonIgnore
    private Enterprise enterprise;
}
