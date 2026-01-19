package ai.kolate.postgres_database_manager.model;

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

import java.time.Instant;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserBookmark {
    @Id
    @UuidGenerator
    private UUID bookmarkId;
    private String bookmarkedBy;
    private UUID projectId;
    private String trialSlug;
    private String executionId;
    private Instant bookmarkedAt;
}
