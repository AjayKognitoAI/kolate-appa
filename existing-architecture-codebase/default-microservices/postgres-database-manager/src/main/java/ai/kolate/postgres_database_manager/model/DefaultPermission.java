package ai.kolate.postgres_database_manager.model;

import ai.kolate.postgres_database_manager.model.enums.AccessType;
import ai.kolate.postgres_database_manager.model.enums.ModuleType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "default_permissions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DefaultPermission {
    @Id
    @GeneratedValue
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ModuleType module;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccessType accessType;

    @ManyToOne
    @JoinColumn(name = "default_role_id", nullable = false)
    private DefaultRole defaultRole;
}

