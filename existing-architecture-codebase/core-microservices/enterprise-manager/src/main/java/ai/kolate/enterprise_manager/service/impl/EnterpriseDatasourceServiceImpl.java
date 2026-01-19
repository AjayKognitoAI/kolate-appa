package ai.kolate.enterprise_manager.service.impl;

import ai.kolate.enterprise_manager.dto.datasource.EnterpriseDatasourceMapper;
import ai.kolate.enterprise_manager.dto.datasource.EnterpriseDatasourceRequestDto;
import ai.kolate.enterprise_manager.dto.datasource.EnterpriseDatasourceResponseDto;
import ai.kolate.enterprise_manager.dto.datasource.EnterpriseDatasourceUpdateDto;
import ai.kolate.enterprise_manager.exception.ResourceNotFoundException;
import ai.kolate.enterprise_manager.model.Enterprise;
import ai.kolate.enterprise_manager.model.EnterpriseDatasource;
import ai.kolate.enterprise_manager.model.enums.EnterpriseStatus;
import ai.kolate.enterprise_manager.repository.EnterpriseDatasourceRepository;
import ai.kolate.enterprise_manager.repository.EnterpriseRepository;
import ai.kolate.enterprise_manager.service.DatasourceCacheService;
import ai.kolate.enterprise_manager.service.EnterpriseDatasourceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EnterpriseDatasourceServiceImpl implements EnterpriseDatasourceService {

    private final EnterpriseDatasourceRepository datasourceRepository;
    private final EnterpriseDatasourceMapper datasourceMapper;
    private final EnterpriseRepository enterpriseRepository;
    private final DatasourceCacheService cacheService;

    @Override
    @Transactional
    public EnterpriseDatasourceResponseDto createDatasource(EnterpriseDatasourceRequestDto requestDto) {
        if (datasourceRepository.existsByOrganizationIdAndDbType(requestDto.getOrganizationId(), requestDto.getDbType())) {
            throw new IllegalStateException("Datasource already exists for organization: "
                    + requestDto.getOrganizationId() + " and dbType: " + requestDto.getDbType());
        }

        EnterpriseDatasource datasource = datasourceMapper.toEntity(requestDto);
        EnterpriseDatasource savedDatasource = datasourceRepository.save(datasource);

        enterpriseRepository.findByOrganizationId(requestDto.getOrganizationId()).ifPresent(enterprise -> {
            enterprise.setStatus(EnterpriseStatus.ACTIVE);
            enterpriseRepository.save(enterprise);
        });

        cacheService.evictDatasourceCache(requestDto.getOrganizationId());
        return datasourceMapper.toResponseDto(savedDatasource);
    }

    @Override
    @Transactional(readOnly = true)
    public EnterpriseDatasourceResponseDto getDatasourceById(UUID id) {
        EnterpriseDatasource datasource = datasourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Datasource not found with id: " + id));
        return datasourceMapper.toResponseDto(datasource);
    }

    @Override
    @Transactional(readOnly = true)
    public EnterpriseDatasourceResponseDto getDatasourceByOrganizationId(String organizationId) {
        EnterpriseDatasource datasource = datasourceRepository.findByOrganizationId(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Datasource not found for organization: " + organizationId));
        return datasourceMapper.toResponseDto(datasource);
    }

    @Override
    @Transactional(readOnly = true)
    public EnterpriseDatasourceResponseDto getDatasourceByOrganizationIdAndDbType(String organizationId, String dbType) {
        EnterpriseDatasource datasource = datasourceRepository.findByOrganizationIdAndDbType(organizationId, dbType)
                .orElseThrow(() -> new ResourceNotFoundException("Datasource not found for organization: " + organizationId + " and dbType: " + dbType));
        return datasourceMapper.toResponseDto(datasource);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnterpriseDatasourceResponseDto> getAllDatasourcesByOrganizationId(String organizationId) {
        List<EnterpriseDatasource> datasources = datasourceRepository.findAllByOrganizationId(organizationId);
        return datasources.stream()
                .map(datasourceMapper::toResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnterpriseDatasourceResponseDto> getAllDatasources() {
        List<EnterpriseDatasource> datasources = datasourceRepository.findAll();
        return datasources.stream()
                .map(datasourceMapper::toResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public EnterpriseDatasourceResponseDto updateDatasource(UUID id, EnterpriseDatasourceUpdateDto updateDto) {
        EnterpriseDatasource datasource = datasourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Datasource not found with id: " + id));
        
        // Get organization ID for cache eviction
        String organizationId = datasource.getOrganizationId();
        
        EnterpriseDatasource updatedDatasource = datasourceMapper.updateEntityFromDto(datasource, updateDto);
        EnterpriseDatasource savedDatasource = datasourceRepository.save(updatedDatasource);
        
        // Evict cache for this organization
        cacheService.evictDatasourceCache(organizationId);
        
        return datasourceMapper.toResponseDto(savedDatasource);
    }

    @Override
    @Transactional
    public void deleteDatasource(UUID id) {
        EnterpriseDatasource datasource = datasourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Datasource not found with id: " + id));
        
        // Get organization ID for cache eviction
        String organizationId = datasource.getOrganizationId();
        
        datasourceRepository.deleteById(id);
        
        // Evict cache for this organization
        cacheService.evictDatasourceCache(organizationId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean datasourceExistsForOrganization(String organizationId) {
        return datasourceRepository.existsByOrganizationId(organizationId);
    }

    @Override
    @Transactional
    public boolean datasourceExistsForOrganizationAndType(String organizationId, String dbType) {
        return datasourceRepository.existsByOrganizationIdAndDbType(organizationId, dbType);
    }
}
