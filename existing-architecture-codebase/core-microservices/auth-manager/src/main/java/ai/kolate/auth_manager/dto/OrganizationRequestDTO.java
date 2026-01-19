package ai.kolate.auth_manager.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.util.HashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OrganizationRequestDTO {
    
    @NotBlank(message = "Display name is required")
    @Pattern(regexp = "^[a-zA-Z0-9 .-]+$", message = "Display name can only contain letters[a-zA-z], numbers[0-9], spaces, dash[-] and period[.]")
    @JsonProperty("display_name")
    private String displayName;
    
    @JsonProperty("logo_url")
    private String logoUrl;
    
    @JsonProperty("primary_color")
    private String primaryColor;
    
    @JsonProperty("page_background_color")
    private String pageBackgroundColor;
    
    /**
     * Converts this DTO to the Auth0 API request format
     * @return A map representing the Auth0 organization creation request
     */
    public Map<String, Object> toAuth0Request() {
        Map<String, Object> request = new HashMap<>();
        request.put("name", displayName.toLowerCase().replaceAll("[ .]", "-"));
        request.put("display_name", displayName);
        
        // Create branding object only if any branding parameters are provided
        if (logoUrl != null || primaryColor != null || pageBackgroundColor != null) {
            Map<String, Object> branding = new HashMap<>();
            
            if (logoUrl != null) {
                branding.put("logo_url", logoUrl);
            }
            
            // Create colors object only if any color parameters are provided
            if (primaryColor != null || pageBackgroundColor != null) {
                Map<String, String> colors = new HashMap<>();
                
                if (primaryColor != null) {
                    colors.put("primary", primaryColor);
                }
                
                if (pageBackgroundColor != null) {
                    colors.put("page_background", pageBackgroundColor);
                }
                
                branding.put("colors", colors);
            }
            
            request.put("branding", branding);
        }
        
        return request;
    }
}
