package ai.kolate.postgres_database_manager.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ProjectUserId implements Serializable {

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "user_auth0_id")
    private String userAuth0Id;
}
