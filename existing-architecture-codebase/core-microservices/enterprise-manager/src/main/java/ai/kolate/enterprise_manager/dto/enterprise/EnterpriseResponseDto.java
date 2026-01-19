package ai.kolate.enterprise_manager.dto.enterprise;

import ai.kolate.enterprise_manager.dto.admin.AdminDTO;
import ai.kolate.enterprise_manager.model.Admin;
import ai.kolate.enterprise_manager.model.enums.EnterpriseStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnterpriseResponseDto {
    private UUID id;
    private String organizationId;
    private String name;
    private String url;
    private String domain;
    private String description;
    private String logoUrl;
    private String adminEmail;
    private String zipCode;
    private String region;
    private String size;
    private String contactNumber;
    private EnterpriseStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Admin count to avoid loading all admins
    private List<Admin> admins;
}
