package ai.kolate.postgres_database_manager.model;

import com.fasterxml.jackson.databind.JsonNode;
import com.vladmihalcea.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String recipient;
    private String type;
    private String status;
    private LocalDateTime timestamp;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private JsonNode data;
}
