package ai.kolate.enterprise_manager.dto.enterprise;

import ai.kolate.enterprise_manager.model.Enterprise;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
public class EnterpriseMapper {

    public Enterprise toEntity(EnterpriseRequestDto dto) {
        if (dto == null) {
            return null;
        }
        
        return Enterprise.builder()
                .name(dto.getName())
                .url(dto.getUrl())
                .domain(dto.getDomain())
                .description(dto.getDescription())
                .logoUrl(dto.getLogoUrl())
                .adminEmail(dto.getAdminEmail())
                .status(dto.getStatus())
                .region(dto.getRegion())
                .zipCode(dto.getZipCode())
                .size(dto.getSize())
                .contactNumber(dto.getContactNumber())
                .build();
    }
    
    public void updateEntityFromDto(Enterprise enterprise, EnterpriseUpdateDto dto) {
        if (dto == null) {
            return;
        }
        
        if (dto.getName() != null) {
            enterprise.setName(dto.getName());
        }
        
        if (dto.getDescription() != null) {
            enterprise.setDescription(dto.getDescription());
        }
        
        if (dto.getLogoUrl() != null) {
            enterprise.setLogoUrl(dto.getLogoUrl());
        }

        if (dto.getSize() != null) {
            enterprise.setSize(dto.getSize());
        }

        if (dto.getContactNumber() != null) {
            enterprise.setContactNumber(dto.getContactNumber());
        }

        if(dto.getRegion() != null) {
            enterprise.setRegion(dto.getRegion());
        }

        if(dto.getZipCode() != null) {
            enterprise.setZipCode(dto.getZipCode());
        }

    }
    
    public EnterpriseResponseDto toDto(Enterprise entity) {
        if (entity == null) {
            return null;
        }
        
        return EnterpriseResponseDto.builder()
                .id(entity.getId())
                .organizationId(entity.getOrganizationId())
                .name(entity.getName())
                .url(entity.getUrl())
                .domain(entity.getDomain())
                .description(entity.getDescription())
                .logoUrl(entity.getLogoUrl())
                .adminEmail(entity.getAdminEmail())
                .contactNumber(entity.getContactNumber())
                .region(entity.getRegion())
                .zipCode(entity.getZipCode())
                .size(entity.getSize())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .admins(Optional.ofNullable(entity.getAdmins()).orElseGet(ArrayList::new))
                .build();
    }
}
