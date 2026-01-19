package ai.kolate.enterprise_manager.service.impl;

import ai.kolate.enterprise_manager.client.AuthManagerClient;
import ai.kolate.enterprise_manager.client.ProjectManagerClient;
import ai.kolate.enterprise_manager.config.ValueConfig;
import ai.kolate.enterprise_manager.dto.PagedResponse;
import ai.kolate.enterprise_manager.dto.enterprise.*;
import ai.kolate.enterprise_manager.dto.kafka.EmailMessage;
import ai.kolate.enterprise_manager.dto.kafka.EnterpriseDeleteRequestTemplateData;
import ai.kolate.enterprise_manager.dto.kafka.KafkaTopics;
import ai.kolate.enterprise_manager.dto.project.ProjectStatsResponse;
import ai.kolate.enterprise_manager.dto.project.ProjectSummaryResponse;
import ai.kolate.enterprise_manager.exception.FeignClientException;
import ai.kolate.enterprise_manager.exception.ResourceNotFoundException;
import ai.kolate.enterprise_manager.model.Admin;
import ai.kolate.enterprise_manager.model.Enterprise;
import ai.kolate.enterprise_manager.model.enums.EnterpriseStatus;
import ai.kolate.enterprise_manager.repository.AdminRepository;
import ai.kolate.enterprise_manager.repository.EnterpriseRepository;
import ai.kolate.enterprise_manager.service.EnterpriseService;
import ai.kolate.enterprise_manager.service.MessagePublisherService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class EnterpriseServiceImpl implements EnterpriseService {

    private final EnterpriseRepository enterpriseRepository;
    private final EnterpriseMapper enterpriseMapper;
    private final AuthManagerClient authManagerClient;
    private final ObjectMapper objectMapper;
    private final ValueConfig valueConfig;
    private final MessagePublisherService messagePublisherService;
    private final AdminRepository adminRepository;
    private final ProjectManagerClient projectManagerClient;

    @Override
    @Transactional
    public EnterpriseResponseDto createEnterprise(EnterpriseRequestDto requestDto) {
        log.info("Creating new enterprise with name: {}", requestDto.getName());
        
        // Convert DTO to Entity
        Enterprise enterprise = enterpriseMapper.toEntity(requestDto);
        
        // Save the enterprise
        Enterprise savedEnterprise = enterpriseRepository.save(enterprise);
        
        // Return the response DTO
        return enterpriseMapper.toDto(savedEnterprise);
    }

    @Override
    @Transactional(readOnly = true)
    public EnterpriseResponseDto getEnterpriseById(UUID id) {
        log.info("Getting enterprise by ID: {}", id);
        
        Enterprise enterprise = enterpriseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found with ID: " + id));
                
        return enterpriseMapper.toDto(enterprise);
    }

    @Override
    @Transactional(readOnly = true)
    public EnterpriseResponseDto getEnterpriseByOrganizationId(String organizationId) {
        log.info("Getting enterprise by organization ID: {}", organizationId);
        
        Enterprise enterprise = enterpriseRepository.findByOrganizationId(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found with organization ID: " + organizationId));
                
        return enterpriseMapper.toDto(enterprise);
    }

    @Override
    @Transactional(readOnly = true)
    public EnterpriseResponseDto getEnterpriseByDomain(String domain) {
        log.info("Getting enterprise by domain: {}", domain);
        
        Enterprise enterprise = enterpriseRepository.findByDomain(domain)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found with domain: " + domain));
                
        return enterpriseMapper.toDto(enterprise);
    }

    @Override
    @Transactional(readOnly = true)
    public EnterpriseResponseDto getEnterpriseByAdminEmail(String adminEmail) {
        log.info("Getting enterprise by admin email: {}", adminEmail);
        
        Enterprise enterprise = enterpriseRepository.findByAdminEmail(adminEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found with admin email: " + adminEmail));
                
        return enterpriseMapper.toDto(enterprise);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnterpriseResponseDto> getAllEnterprises() {
        log.info("Getting all enterprises");
        
        return enterpriseRepository.findAll().stream()
                .map(enterpriseMapper::toDto)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional(readOnly = true)
    public Page<EnterpriseResponseDto> getAllEnterprisesPaginated(int page, int size, String sort, String direction) {
        log.info("Getting all enterprises with pagination: page={}, size={}, sort={}, direction={}", page, size, sort, direction);
        
        // Create the sort object based on direction
        Sort.Direction sortDirection = "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
        Sort sortBy = Sort.by(sortDirection, sort);
        
        // Create the pageable object
        Pageable pageable = PageRequest.of(page, size, sortBy);
        
        // Get paginated enterprises and map them to DTOs
        Page<Enterprise> enterprisesPage = enterpriseRepository.findAll(pageable);
        
        // Map the page of entities to a page of DTOs
        return enterprisesPage.map(enterpriseMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnterpriseResponseDto> getEnterprisesByStatus(EnterpriseStatus status) {
        log.info("Getting enterprises by status: {}", status);
        
        return enterpriseRepository.findByStatus(status).stream()
                .map(enterpriseMapper::toDto)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional(readOnly = true)
    public Page<EnterpriseResponseDto> getEnterprisesByStatusPaginated(EnterpriseStatus status, int page, int size, String sort, String direction) {
        log.info("Getting enterprises by status with pagination: status={}, page={}, size={}, sort={}, direction={}", status, page, size, sort, direction);
        
        // Create the sort object based on direction
        Sort.Direction sortDirection = "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
        Sort sortBy = Sort.by(sortDirection, sort);
        
        // Create the pageable object
        Pageable pageable = PageRequest.of(page, size, sortBy);
        
        // Get paginated enterprises by status and map them to DTOs
        Page<Enterprise> enterprisesPage = enterpriseRepository.findByStatus(status, pageable);
        
        // Map the page of entities to a page of DTOs
        return enterprisesPage.map(enterpriseMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnterpriseResponseDto> searchEnterprises(String keyword) {
        log.info("Searching enterprises with keyword: {}", keyword);
        
        return enterpriseRepository.searchByNameOrDescription(keyword).stream()
                .map(enterpriseMapper::toDto)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional(readOnly = true)
    public Page<EnterpriseResponseDto> searchEnterprisesPaginated(String keyword, int page, int size, String sort, String direction) {
        log.info("Searching enterprises with pagination: keyword={}, page={}, size={}, sort={}, direction={}", keyword, page, size, sort, direction);
        
        // Create the sort object based on direction
        Sort.Direction sortDirection = "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
        Sort sortBy = Sort.by(sortDirection, sort);
        
        // Create the pageable object
        Pageable pageable = PageRequest.of(page, size, sortBy);
        
        // Search paginated enterprises and map them to DTOs
        Page<Enterprise> enterprisesPage = enterpriseRepository.searchByNameOrDescription(keyword, pageable);
        
        // Map the page of entities to a page of DTOs
        return enterprisesPage.map(enterpriseMapper::toDto);
    }

    @Override
    @Transactional
    public EnterpriseResponseDto updateEnterprise(UUID id, EnterpriseUpdateDto updateDto) {
        log.info("Updating enterprise with ID: {}", id);
        
        // Find the enterprise to update
        Enterprise enterprise = enterpriseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found with ID: " + id));
                
        // Update the enterprise from the DTO
        enterpriseMapper.updateEntityFromDto(enterprise, updateDto);
        
        // Save the updated enterprise
        Enterprise updatedEnterprise = enterpriseRepository.save(enterprise);
        
        // Return the response DTO
        return enterpriseMapper.toDto(updatedEnterprise);
    }

    @Transactional
    @Override
    public EnterpriseResponseDto updateEnterpriseWithOrganizationId(String organizationId, EnterpriseUpdateDto updateDto) {
        log.info("Updating enterprise with ID: {}", organizationId);

        // Find the enterprise to update
        Enterprise enterprise = enterpriseRepository.findByOrganizationId(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found with ID: " + organizationId));

        // Update the enterprise from the DTO
        enterpriseMapper.updateEntityFromDto(enterprise, updateDto);

        // Save the updated enterprise
        Enterprise updatedEnterprise = enterpriseRepository.save(enterprise);

        // Return the response DTO
        return enterpriseMapper.toDto(updatedEnterprise);
    }

    @Override
    @Transactional
    public EnterpriseResponseDto updateEnterpriseStatus(UUID id, EnterpriseStatus status) {
        log.info("Updating enterprise status to {} for ID: {}", status, id);
        
        // Find the enterprise to update
        Enterprise enterprise = enterpriseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found with ID: " + id));
                
        // Update the status
        enterprise.setStatus(status);
        
        // Save the updated enterprise
        Enterprise updatedEnterprise = enterpriseRepository.save(enterprise);
        
        // Return the response DTO
        return enterpriseMapper.toDto(updatedEnterprise);
    }

    @Override
    @Transactional
    public void deleteEnterprise(UUID id) {
        log.info("Deleting enterprise with ID: {}", id);
        
        // Check if enterprise exists
        if (!enterpriseRepository.existsById(id)) {
            throw new ResourceNotFoundException("Enterprise not found with ID: " + id);
        }
        
        // Delete the enterprise
        enterpriseRepository.deleteById(id);
    }

    @Override
    public void softDeleteEnterprise(UUID id) {
        log.info("Soft-deleting enterprise with ID: {}", id);

        Enterprise enterprise = enterpriseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found with ID: " + id));

        enterprise.setStatus(EnterpriseStatus.DELETED);

        try {
            // Use feign client to delete organization connection
            String organizationId = enterprise.getOrganizationId();

            log.info("Deleting organization connection for organization ID: {}", organizationId);
            ResponseEntity<String> response = authManagerClient.deleteOrganizationConnection(organizationId);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Successfully deleted organization connection for enterprise ID: {}", id);
            } else {
                log.warn("Failed to delete organization connection. Status: {}, Response: {}",
                        response.getStatusCode(), response.getBody());
            }

        } catch (FeignException e) {
            log.error("Feign client error while deleting organization connection for enterprise ID: {}", id, e);
            log.warn("Continuing with enterprise soft delete despite connection deletion failure");

        } catch (Exception e) {
            log.error("Unexpected error while deleting organization connection for enterprise ID: {}", id, e);
            // Handle other exceptions
        }

//        send delete initiation notification to the enterprise admin
        // Send notification via Kafka
        try {
            EnterpriseDeleteNotificationTemplateData templateData = EnterpriseDeleteNotificationTemplateData.builder()
                    .enterpriseName(enterprise.getName())
                    .build();

            String templateDataJson = objectMapper.writeValueAsString(templateData);

            List<String> admins = enterprise.getAdmins().stream().map(Admin::getEmail).toList();

            EmailMessage emailMessage = EmailMessage.builder()
                    .source("enterprise-manager")
                    .to(admins)
                    .templateName(valueConfig.getEnterpriseDeleteInitTemplateName())
                    .templateData(templateDataJson)
                    .subject("Account Deletion Confirmation")
                    .from("no-reply@kolate.ai")
                    .build();

            boolean published = messagePublisherService.publishMessage(emailMessage, KafkaTopics.TOPIC_NOTIFICATION_EMAIL);
            if (!published) {
                log.error("Kafka publish returned false — Failed to send delete notification email");
                throw new IllegalStateException("Failed to send delete notification email");
            }
            log.info("Published delete notification message to Kafka for enterprise ID: {}", enterprise.getId());

        } catch (JsonProcessingException e) {
            log.error("Error serializing template data for Kafka message", e);
            // Continue execution despite error in message publishing
        }  catch (FeignException | FeignClientException e) {
            // Log the error but continue execution
            log.error("Failed to publish message to Kafka. Enterprise will be deleted but notification may not be sent.", e);
        }

        enterpriseRepository.save(enterprise);
        log.info("Enterprise with ID: {} has been soft-deleted", id);
    }

    @Override
    public void requestDeleteEnterprise(String adminId, String organizationId, DeleteEnterpriseRequestDto requestDto) {
        Enterprise enterprise = enterpriseRepository.findByOrganizationId(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise not found with ID: " + organizationId));
        // Send notification via Kafka
        try {
            EnterpriseDeleteRequestTemplateData templateData = EnterpriseDeleteRequestTemplateData.builder()
                    .enterpriseName(enterprise.getName())
                    .reason(requestDto.getDeleteReason())
                    .build();

            String senderEmail = adminRepository.findByAuth0Id(adminId)
                    .map(Admin::getEmail)
                    .orElse(enterprise.getAdminEmail());

            String templateDataJson = objectMapper.writeValueAsString(templateData);

            EmailMessage emailMessage = EmailMessage.builder()
                    .source("enterprise-manager")
                    .to(Collections.singletonList(valueConfig.getKolateSupportEmail()))
                    .templateName(valueConfig.getEnterpriseDeleteRequestTemplateName())
                    .templateData(templateDataJson)
                    .subject("Enterprise Account Deletion Request")
                    .from(senderEmail)
                    .build();

            boolean published = messagePublisherService.publishMessage(emailMessage, KafkaTopics.TOPIC_NOTIFICATION_EMAIL);
            if (!published) {
                log.error("Kafka publish returned false — Failed to send delete notification email");
                throw new IllegalStateException("Failed to send delete notification email");
            }
            log.info("Published delete notification message to Kafka for enterprise ID: {}", enterprise.getId());

        } catch (JsonProcessingException e) {
            log.error("Error serializing template data for Kafka message", e);
            // Continue execution despite error in message publishing
        }  catch (FeignException | FeignClientException e) {
            // Log the error but continue execution
            log.error("Failed to publish message to Kafka. Enterprise will be deleted but notification may not be sent.", e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean domainExists(String domain) {
        log.info("Checking if domain exists: {}", domain);
        return enterpriseRepository.existsByDomain(domain);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean organizationIdExists(String organizationId) {
        log.info("Checking if organization ID exists: {}", organizationId);
        return enterpriseRepository.existsByOrganizationId(organizationId);
    }

    @Override
    public EnterpriseStatsDto getEnterpriseStats() {
        long total = enterpriseRepository.count();
        long deactivated = enterpriseRepository.countByStatus(EnterpriseStatus.DEACTIVATED);

        return EnterpriseStatsDto.builder()
                .totalEnterprises(total)
                .deactivatedEnterprises(deactivated)
                .build();
    }

    @Override
    public PagedResponse<ProjectSummaryResponse> getAllProjects(int page, int size, String sortBy, String sortDirection, String orgId) {
        try {
            log.debug("Retrieving all projects - page: {}, size: {}, sortBy: {}, sortDirection: {}",
                    page, size, sortBy, sortDirection);
            PagedResponse<ProjectSummaryResponse> response = projectManagerClient.getAllProjects(page, size, sortBy, sortDirection, orgId);
            log.debug("Successfully retrieved {} projects", response.getTotalElements());
            return response;
        } catch (FeignException e) {
            log.error("Failed to retrieve all projects: {}", e.getMessage());
            throw new FeignClientException(e.status(), e.getMessage(), e.getMessage());
        }
    }

    @Override
    public ProjectStatsResponse getEnterpriseProjectStats(String orgId) {
        try {
            ProjectStatsResponse projectStatistics = projectManagerClient.getEnterpriseProjectStats(orgId);
            log.info("Successfully fetch enterprise project stats");
            return projectStatistics;
        } catch (FeignException e) {
            log.error("Failed to fetch enterprise project stats: {}", e.getMessage());
            throw new FeignClientException(e.status(), e.getMessage(), e.getMessage());
        }
    }
}
