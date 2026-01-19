package ai.kolate.enterprise_manager.dto.admin;

import ai.kolate.enterprise_manager.model.enums.UserType;
import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUpdateDTO {
    private UUID id;
    private String firstName;
    private String lastName;
    
    @Email(message = "Email should be valid")
    private String email;
    
    private UserType userType;
    private String organizationId;
}
