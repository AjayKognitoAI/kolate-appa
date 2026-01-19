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
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(name = "enterprise_datasources", indexes = {
        @Index(name = "datasources_organization_id_index", columnList = "organization_id"),
        @Index(name = "datasources_org_type_index", columnList = "organization_id, db_type", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnterpriseDatasource {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private String organizationId;

    @Column(name = "db_type", nullable = false)
    private String dbType; // e.g., "postgres", "mongodb", "redis"

    @Column(name = "datasource_url", nullable = false)
    private String datasourceUrl;

    @Column(name = "datasource_username")
    private String datasourceUsername;

    @Column(name = "datasource_password")
    private String datasourcePassword;

    @Column(name = "datasource_schema")
    private String datasourceSchema;
}
