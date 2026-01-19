package ai.kolate.enterprise_manager.service.impl;

import ai.kolate.enterprise_manager.client.AuthManagerClient;
import ai.kolate.enterprise_manager.config.ValueConfig;
import ai.kolate.enterprise_manager.dto.auth0.Auth0OrganizationRequest;
import ai.kolate.enterprise_manager.dto.auth0.Auth0OrganizationResponse;
import ai.kolate.enterprise_manager.dto.auth0.Auth0SsoTicketRequest;
import ai.kolate.enterprise_manager.dto.auth0.Auth0SsoTicketResponse;
import ai.kolate.enterprise_manager.dto.kafka.DataSourceMessage;
import ai.kolate.enterprise_manager.dto.kafka.EmailMessage;
import ai.kolate.enterprise_manager.dto.kafka.EnterpriseInviteTemplateData;
import ai.kolate.enterprise_manager.dto.kafka.KafkaTopics;
import ai.kolate.enterprise_manager.dto.onboard.EnterpriseInviteRequest;
import ai.kolate.enterprise_manager.dto.onboard.EnterpriseInviteResponse;
import ai.kolate.enterprise_manager.dto.onboard.EnterpriseReInviteRequest;
import ai.kolate.enterprise_manager.dto.onboard.OnboardRequest;
import ai.kolate.enterprise_manager.dto.onboard.OnboardResponse;
import ai.kolate.enterprise_manager.dto.onboard.OrganizationConnectionEventDto;
import ai.kolate.enterprise_manager.exception.FeignClientException;
import ai.kolate.enterprise_manager.model.Admin;
import ai.kolate.enterprise_manager.model.Enterprise;
import ai.kolate.enterprise_manager.model.SsoTicket;
import ai.kolate.enterprise_manager.model.enums.EnterpriseStatus;
import ai.kolate.enterprise_manager.model.enums.UserType;
import ai.kolate.enterprise_manager.repository.AdminRepository;
import ai.kolate.enterprise_manager.repository.EnterpriseRepository;
import ai.kolate.enterprise_manager.repository.SsoTicketRepository;
import ai.kolate.enterprise_manager.service.MessagePublisherService;
import ai.kolate.enterprise_manager.service.OnboardService;
import ai.kolate.enterprise_manager.util.PasswordGenerator;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class OnboardServiceImpl implements OnboardService {

    private final EnterpriseRepository enterpriseRepository;
    private final AdminRepository adminRepository;
    private final SsoTicketRepository ssoTicketRepository;
    private final MessagePublisherService messagePublisherService;
    private final AuthManagerClient authManagerClient;
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;
    private final ValueConfig valueConfig;
    
    /**
     * Creates a record in the enterprise table with status INVITED,
     * adds an admin record, and sends a message to the message publisher.
     */
    @Override
    @Transactional
    public EnterpriseInviteResponse inviteEnterprise(EnterpriseInviteRequest request) {
        log.info("Processing enterprise invitation for: {}", request.getEnterpriseName());
        
        // Check if enterprise with the same admin email already exists
        if (enterpriseRepository.findByAdminEmail(request.getAdminEmail()).isPresent()) {
            log.warn("Enterprise with admin email {} already exists", request.getAdminEmail());
            throw new IllegalArgumentException("Enterprise with this admin email already exists");
        }

        // Extract domain from enterprise URL
        String enterpriseDomain = request.getAdminEmail().split("@")[1];

        // Check if enterprise with the same domain already exists
        if (enterpriseRepository.existsByDomain(enterpriseDomain)) {
            log.warn("Enterprise domain {} already in use", enterpriseDomain);
            throw new IllegalArgumentException("Enterprise domain already in use");
        }
        
        // Create enterprise record
        Enterprise enterprise = Enterprise.builder()
                .name(request.getEnterpriseName())
                .url(request.getEnterpriseUrl())
                .domain(enterpriseDomain)
                .adminEmail(request.getAdminEmail())
                .status(EnterpriseStatus.PENDING)
                .build();
        
        Enterprise savedEnterprise = enterpriseRepository.save(enterprise);
        log.info("Created enterprise record with ID: {}", savedEnterprise.getId());
        
        // Create admin record
        Admin admin = Admin.builder()
                .email(request.getAdminEmail())
                .userType(UserType.ORGANIZATION_ADMIN)
                .enterprise(savedEnterprise)
                .build();
        
        adminRepository.save(admin);
        log.info("Created admin record with ID: {}", admin.getId());

        // Generate invite URL
        String inviteUrl = String.format(valueConfig.getInviteUrl(),
                valueConfig.getAuth0Client(),
                enterprise.getId(), URLEncoder.encode(enterprise.getName(), StandardCharsets.UTF_8));


        // Send notification via Kafka
        try {
            EnterpriseInviteTemplateData templateData = EnterpriseInviteTemplateData.builder()
                    .enterpriseName(request.getEnterpriseName())
                    .adminEmail(request.getAdminEmail())
                    .enterpriseUrl(request.getEnterpriseUrl())
                    .domain(enterpriseDomain)
                    .inviteUrl(inviteUrl)
                    .build();
            
            String templateDataJson = objectMapper.writeValueAsString(templateData);

            EmailMessage emailMessage = EmailMessage.builder()
                    .source("enterprise-manager")
                    .to(List.of(request.getAdminEmail()))
                    .templateName(valueConfig.getInviteTemplateName())
                    .templateData(templateDataJson)
                    .subject("Welcome to Kolate Enterprise: " + savedEnterprise.getName())
                    .from("no-reply@kolate.ai")
                    .build();

            boolean published = messagePublisherService.publishMessage(emailMessage, KafkaTopics.TOPIC_NOTIFICATION_EMAIL);
            if (!published) {
                log.error("Kafka publish returned false — failing invite process");
                throw new IllegalStateException("Failed to send invitation email");
            }
            log.info("Published invitation message to Kafka for enterprise ID: {}", savedEnterprise.getId());

        } catch (JsonProcessingException e) {
            log.error("Error serializing template data for Kafka message", e);
            // Continue execution despite error in message publishing
        }  catch (FeignException | FeignClientException e) {
            // Log the error but continue execution
            log.error("Failed to publish message to Kafka. Enterprise will be created but notification may not be sent.", e);
        }

        enterprise.setStatus(EnterpriseStatus.INVITED);
        enterpriseRepository.save(enterprise);
        
        // Build and return response
        return EnterpriseInviteResponse.builder()
                .enterpriseId(savedEnterprise.getId())
                .enterpriseName(savedEnterprise.getName())
                .enterpriseDomain(enterpriseDomain)
                .adminEmail(savedEnterprise.getAdminEmail())
                .message("Enterprise invitation sent successfully")
                .build();
    }

    /**
     * Sends request to auth manager to create organization, updates the enterprise table with organization ID,
     * caches the {adminEmail:organizationId} as key-value in Redis, and generates an SSO ticket.
     */
    /**
     * Re-sends the invitation message to an existing enterprise.
     * Verifies that the enterprise exists and sends a new invitation message.
     */
    @Override
    @Transactional
    public EnterpriseInviteResponse reInviteEnterprise(EnterpriseReInviteRequest request) {
        log.info("Processing enterprise re-invitation for ID: {}", request.getEnterpriseId());
        
        // Find enterprise by ID
        Enterprise enterprise = enterpriseRepository.findById(request.getEnterpriseId())
                .orElseThrow(() -> new IllegalArgumentException("Enterprise not found with ID: " + request.getEnterpriseId()));
        
        // Generate invite URL
        String inviteUrl = String.format(valueConfig.getInviteUrl(),
                valueConfig.getAuth0Client(),
                enterprise.getId(), URLEncoder.encode(enterprise.getName(), StandardCharsets.UTF_8));
        
        // Send notification via Kafka
        try {
            EnterpriseInviteTemplateData templateData = EnterpriseInviteTemplateData.builder()
                    .enterpriseName(enterprise.getName())
                    .adminEmail(enterprise.getAdminEmail())
                    .enterpriseUrl(enterprise.getUrl())
                    .domain(enterprise.getDomain())
                    .inviteUrl(inviteUrl)
                    .build();
            
            String templateDataJson = objectMapper.writeValueAsString(templateData);

            EmailMessage emailMessage = EmailMessage.builder()
                    .source("enterprise-manager")
                    .to(List.of(enterprise.getAdminEmail()))
                    .templateName(valueConfig.getInviteTemplateName())
                    .templateData(templateDataJson)
                    .subject("Welcome to Kolate Enterprise: " + enterprise.getName())
                    .from("no-reply@kolate.ai")
                    .build();

            try {
                boolean published = messagePublisherService.publishMessage(emailMessage, KafkaTopics.TOPIC_NOTIFICATION_EMAIL);
                if(published) {
                    log.info("Published invitation message to Kafka for enterprise ID: {}", enterprise.getId());
                } else {
                    throw new FeignClientException(HttpStatus.INTERNAL_SERVER_ERROR.value(), "Error sending message to message-publisher", HttpStatus.INTERNAL_SERVER_ERROR.name());
                }
            } catch (FeignException | FeignClientException e) {
                // Log the error but continue execution
                log.error("Failed to publish message to Kafka. Enterprise will be created but notification may not be sent.", e);
            }
        } catch (JsonProcessingException e) {
            log.error("Error serializing template data for Kafka message", e);
            throw new IllegalStateException("Failed to serialize invitation message: " + e.getMessage(), e);
        }
        
        // Ensure enterprise status is INVITED if it wasn't already
        if (enterprise.getStatus() != EnterpriseStatus.INVITED) {
            enterprise.setStatus(EnterpriseStatus.INVITED);
            enterpriseRepository.save(enterprise);
        }
        
        // Build and return response
        return EnterpriseInviteResponse.builder()
                .enterpriseId(enterprise.getId())
                .enterpriseName(enterprise.getName())
                .enterpriseDomain(enterprise.getDomain())
                .adminEmail(enterprise.getAdminEmail())
                .message("Enterprise re-invitation sent successfully")
                .build();
    }

    @Override
    @Transactional
    public OnboardResponse onboardEnterprise(OnboardRequest request) {
        log.info("Processing onboarding request for enterprise ID: {}", request.getEnterpriseId());
        
        // Find enterprise by ID
        Enterprise enterprise = enterpriseRepository.findById(request.getEnterpriseId())
                .orElseThrow(() -> new IllegalArgumentException("Enterprise not found with ID: " + request.getEnterpriseId()));
        
        // Verify enterprise status is INVITED
        if (enterprise.getStatus() != EnterpriseStatus.INVITED) {
            log.warn("Enterprise with ID {} has invalid status: {}", enterprise.getId(), enterprise.getStatus());
            throw new IllegalStateException("Enterprise is not in INVITED status");
        }
        
        // Create organization in Auth0
        Auth0OrganizationResponse organization;
        try {
            Auth0OrganizationRequest orgRequest = Auth0OrganizationRequest.builder()
                    .displayName(enterprise.getName())
                    .logoUrl(request.getLogoUrl())
                    .primaryColor(request.getPrimaryColor())
                    .pageBackgroundColor(request.getPageBackgroundColor())
                    .build();
            
            ResponseEntity<Auth0OrganizationResponse> orgResponse = authManagerClient.createOrganization(orgRequest);
            organization = orgResponse.getBody();
            
            if (organization == null || organization.getId() == null) {
                log.error("Failed to create Auth0 organization for enterprise ID: {} - Response body was null", enterprise.getId());
                throw new IllegalStateException("Failed to create Auth0 organization - empty response");
            }
            
            log.info("Created Auth0 organization with ID: {} for enterprise ID: {}", organization.getId(), enterprise.getId());
        } catch (FeignException | FeignClientException e) {
            log.error("Failed to create Auth0 organization for enterprise ID: {}", enterprise.getId(), e);
            if (e instanceof FeignClientException) {
                FeignClientException fce = (FeignClientException) e;
                String errorDetails = fce.getErrorBody() != null ? fce.getErrorBody() : "No details available";
                throw new IllegalStateException("Failed to create Auth0 organization: " + errorDetails, e);
            } else {
                throw new IllegalStateException("Failed to create Auth0 organization: " + e.getMessage(), e);
            }
        }
        
        // Update enterprise with organization ID and status
        enterprise.setOrganizationId(organization.getId());
        enterprise.setStatus(EnterpriseStatus.INITIATED);
        enterpriseRepository.save(enterprise);
        
        // Update admin records with organization ID
        Admin admin = adminRepository.findByEmail(enterprise.getAdminEmail())
                .orElseThrow(() -> new IllegalStateException("Admin not found for email: " + enterprise.getAdminEmail()));
        admin.setOrganizationId(organization.getId());
        adminRepository.save(admin);
        
        // Cache admin email to organization ID mapping in Redis
        redisTemplate.opsForValue().set(
                "is_org_admin:" + enterprise.getAdminEmail(),
                organization.getId()
        );
        
        // Generate SSO ticket
        Auth0SsoTicketResponse ticket;
        try {
            Auth0SsoTicketRequest ticketRequest = Auth0SsoTicketRequest.builder()
                    .displayName(enterprise.getName()+" Sso")
                    .iconUrl(request.getLogoUrl())
                    .domainAliases(request.getDomainAliases() != null ? request.getDomainAliases() : new ArrayList<>())
                    .organizationId(organization.getId())
                    .build();
            
            ResponseEntity<Auth0SsoTicketResponse> ticketResponse = authManagerClient.createSSOTicket(ticketRequest);
            ticket = ticketResponse.getBody();
            
            if (ticket == null || ticket.getTicket() == null) {
                log.error("Failed to create SSO ticket for organization ID: {} - Response body was null", organization.getId());
                throw new IllegalStateException("Failed to create SSO ticket - empty response");
            }
            
            log.info("Created SSO ticket for organization ID: {}", organization.getId());
        } catch (FeignException | FeignClientException e) {
            log.error("Failed to create SSO ticket for organization ID: {}", organization.getId(), e);
            if (e instanceof FeignClientException) {
                FeignClientException fce = (FeignClientException) e;
                String errorDetails = fce.getErrorBody() != null ? fce.getErrorBody() : "No details available";
                throw new IllegalStateException("Failed to create SSO ticket: " + errorDetails, e);
            } else {
                throw new IllegalStateException("Failed to create SSO ticket: " + e.getMessage(), e);
            }
        }
        
        // Save SSO ticket record
        SsoTicket ssoTicket = SsoTicket.builder()
                .enterpriseId(enterprise.getId())
                .organizationId(organization.getId())
                .adminEmail(enterprise.getAdminEmail())
                .ticketUrl(ticket.getTicket())
                .build();
        
        ssoTicketRepository.save(ssoTicket);
        
        // Build and return response
        return OnboardResponse.builder()
                .organization(organization)
                .ticket(ticket)
                .build();
    }

    @Override
    public void notifyInfraProvisioner(OrganizationConnectionEventDto data) {
        String organizationId = data.getData().getEventObject().getOrganization().getId();
        String databaseName = organizationId.toLowerCase() + "_db";
        String databaseUser = organizationId.toLowerCase() + "_user";
        String schemaName = organizationId.toLowerCase()+valueConfig.getSchemaNamePrefix();
        String password = PasswordGenerator.generatePassword(8);
        log.info("database name :: {} with pwd :: {} generated", databaseName, password);

        DataSourceMessage dataSourceMessage = DataSourceMessage.builder()
                .id(organizationId)
                .database(databaseName)
                .user(databaseUser)
                .password(password)
                .schema(schemaName)
                .build();

        // Send notification via Kafka
        try {
            boolean published = messagePublisherService.publishMessage(dataSourceMessage, KafkaTopics.TOPIC_PROVISION_INFRA);
            if(published) {
                log.info("Published datasource message to Kafka for enterprise ID: {}", data.getData().getEventObject().getOrganization().getId());
            } else {
                throw new FeignClientException(HttpStatus.INTERNAL_SERVER_ERROR.value(), "Error sending message to message-publisher", HttpStatus.INTERNAL_SERVER_ERROR.name());
            }
        } catch (FeignException | FeignClientException e) {
            // Log the error but continue execution
            log.error("Failed to publish message to Kafka.", e);
        }
    }
}

