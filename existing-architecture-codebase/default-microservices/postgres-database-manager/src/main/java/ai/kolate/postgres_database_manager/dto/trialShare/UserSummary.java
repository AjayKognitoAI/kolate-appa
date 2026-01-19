package ai.kolate.postgres_database_manager.dto.trialShare;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class UserSummary {
    private String auth0Id;
    private String firstName;
    private String lastName;
    private String email;
    private String avatarUrl;
    private String jobTitle;
}
