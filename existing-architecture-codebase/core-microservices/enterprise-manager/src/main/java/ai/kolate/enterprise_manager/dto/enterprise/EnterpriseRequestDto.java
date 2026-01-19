package ai.kolate.enterprise_manager.dto.enterprise;

import ai.kolate.enterprise_manager.model.enums.EnterpriseStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EnterpriseRequestDto {

    @NotBlank(message = "Enterprise name is required")
    private String name;
    @Pattern(regexp = "^(https?://)?([\\da-z.-]+)\\.([a-z.]{2,6})([/\\w .-]*)*/?$", 
            message = "URL must be a valid URL format")
    private String url;
    @Pattern(regexp = "^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\\.[a-zA-Z]{2,}$", 
            message = "Domain must be a valid domain format")
    private String domain;
    private String description;
    private String logoUrl;
    @Email(message = "Admin email must be a valid email format")
    @NotBlank(message = "Admin email is required")
    private String adminEmail;
    private String size;
    private String region;
    private String contactNumber;
    private String zipCode;
    private EnterpriseStatus status;
}
