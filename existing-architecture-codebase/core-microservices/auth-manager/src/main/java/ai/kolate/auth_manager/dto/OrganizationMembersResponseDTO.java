package ai.kolate.auth_manager.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/**
 * DTO representing the paginated response for organization members from Auth0 Management API
 */
@Data
public class OrganizationMembersResponseDTO {

    private List<UserResponseDTO> users;

    // For offset pagination
    private Integer start;
    private Integer limit;
    private Integer total;

    // For checkpoint pagination
    private String next;
}
