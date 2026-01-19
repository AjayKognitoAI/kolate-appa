package ai.kolate.enterprise_infra_provisioner.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "port_mappings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortMapping {

    @Id
    @Column(name = "id")
    private String id; // same as request.getId()

    @Column(name = "port", unique = true, nullable = false)
    private int port;
}

