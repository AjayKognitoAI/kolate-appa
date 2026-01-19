package ai.kolate.user_manager.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class InviteUserRequestDTO {
    
    @NotBlank(message = "Inviter name is required")
    private String inviterName;
    
    @NotBlank(message = "Invitee email is required")
    @Email(message = "Invalid email format")
    private String inviteeEmail;
    
    private String roleId;
}
