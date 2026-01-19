package ai.kolate.postgres_database_manager.model;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "project_users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectUser {

    @EmbeddedId
    private ProjectUserId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", insertable = false, updatable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_auth0_id", referencedColumnName = "auth0_id", insertable = false, updatable = false)
    private User user;

//    @Enumerated(EnumType.STRING)
//    private ProjectRole projectRole;

    @ManyToOne
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;
}
