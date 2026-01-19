package ai.kolate.enterprise_manager.dto.datasource;

import ai.kolate.enterprise_manager.model.EnterpriseDatasource;
import org.springframework.stereotype.Component;

@Component
public class EnterpriseDatasourceMapper {

    /**
     * Convert EnterpriseDatasource entity to response DTO
     * @param datasource The datasource entity
     * @return The response DTO
     */
    public EnterpriseDatasourceResponseDto toResponseDto(EnterpriseDatasource datasource) {
        if (datasource == null) {
            return null;
        }
        
        return EnterpriseDatasourceResponseDto.builder()
                .id(datasource.getId())
                .dbType(datasource.getDbType())
                .organizationId(datasource.getOrganizationId())
                .datasourceUrl(datasource.getDatasourceUrl())
                .datasourceUsername(datasource.getDatasourceUsername())
                .datasourcePassword(datasource.getDatasourcePassword())
                .datasourceSchema(datasource.getDatasourceSchema())
                .build();
    }
    
    /**
     * Convert request DTO to EnterpriseDatasource entity
     * @param requestDto The request DTO
     * @return The datasource entity
     */
    public EnterpriseDatasource toEntity(EnterpriseDatasourceRequestDto requestDto) {
        if (requestDto == null) {
            return null;
        }
        
        return EnterpriseDatasource.builder()
                .organizationId(requestDto.getOrganizationId())
                .dbType(requestDto.getDbType())
                .datasourceUrl(requestDto.getDatasourceUrl())
                .datasourceUsername(requestDto.getDatasourceUsername())
                .datasourcePassword(requestDto.getDatasourcePassword())
                .datasourceSchema(requestDto.getDatasourceSchema())
                .build();
    }
    
    /**
     * Update EnterpriseDatasource entity from update DTO
     * @param datasource The existing datasource entity
     * @param updateDto The update DTO
     * @return The updated datasource entity
     */
    public EnterpriseDatasource updateEntityFromDto(EnterpriseDatasource datasource, EnterpriseDatasourceUpdateDto updateDto) {
        if (datasource == null || updateDto == null) {
            return datasource;
        }
        
        // Only update fields that are not null
        if (updateDto.getDatasourceUrl() != null) {
            datasource.setDatasourceUrl(updateDto.getDatasourceUrl());
        }
        
        if (updateDto.getDatasourceUsername() != null) {
            datasource.setDatasourceUsername(updateDto.getDatasourceUsername());
        }
        
        if (updateDto.getDatasourcePassword() != null) {
            datasource.setDatasourcePassword(updateDto.getDatasourcePassword());
        }
        
        if (updateDto.getDatasourceSchema() != null) {
            datasource.setDatasourceSchema(updateDto.getDatasourceSchema());
        }
        
        return datasource;
    }
}
