package ai.kolate.enterprise_manager.service.impl;

import ai.kolate.enterprise_manager.dto.ssoticket.SsoTicketResponseDto;
import ai.kolate.enterprise_manager.exception.ResourceNotFoundException;
import ai.kolate.enterprise_manager.model.SsoTicket;
import ai.kolate.enterprise_manager.repository.SsoTicketRepository;
import ai.kolate.enterprise_manager.service.SsoTicketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class SsoTicketServiceImpl implements SsoTicketService {

    private final SsoTicketRepository ssoTicketRepository;
    
    @Override
    public SsoTicketResponseDto getSsoTicketById(UUID id) {
        log.info("Getting SSO ticket by ID: {}", id);
        SsoTicket ssoTicket = ssoTicketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SSO Ticket not found with ID: " + id));
        return mapToDto(ssoTicket);
    }
    
    @Override
    public List<SsoTicketResponseDto> getSsoTicketsByEnterpriseId(UUID enterpriseId) {
        log.info("Getting SSO tickets by enterprise ID: {}", enterpriseId);
        List<SsoTicket> ssoTickets = ssoTicketRepository.findByEnterpriseId(enterpriseId);
        return ssoTickets.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }
    
    @Override
    public List<SsoTicketResponseDto> getSsoTicketsByOrganizationId(String organizationId) {
        log.info("Getting SSO tickets by organization ID: {}", organizationId);
        List<SsoTicket> ssoTickets = ssoTicketRepository.findByOrganizationId(organizationId);
        return ssoTickets.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }
    
    @Override
    public SsoTicketResponseDto getSsoTicketByAdminEmail(String adminEmail) {
        log.info("Getting SSO ticket by admin email: {}", adminEmail);
        SsoTicket ssoTicket = ssoTicketRepository.findByAdminEmail(adminEmail)
                .orElseThrow(() -> new ResourceNotFoundException("SSO Ticket not found with admin email: " + adminEmail));
        return mapToDto(ssoTicket);
    }
    
    @Override
    @Transactional
    public void deleteSsoTicket(UUID id) {
        log.info("Deleting SSO ticket with ID: {}", id);
        if (!ssoTicketRepository.existsById(id)) {
            throw new ResourceNotFoundException("SSO Ticket not found with ID: " + id);
        }
        ssoTicketRepository.deleteById(id);
    }
    
    @Override
    @Transactional
    public int deleteExpiredSsoTickets(int expirationHours) {
        log.info("Deleting expired SSO tickets older than {} hours", expirationHours);
        LocalDateTime expirationTime = LocalDateTime.now().minusHours(expirationHours);
        List<SsoTicket> expiredTickets = ssoTicketRepository.findByCreatedAtBefore(expirationTime);
        int count = expiredTickets.size();
        ssoTicketRepository.deleteByCreatedAtBefore(expirationTime);
        log.info("Deleted {} expired SSO tickets", count);
        return count;
    }
    
    /**
     * Maps a SsoTicket entity to a SsoTicketResponseDto
     * @param ssoTicket The SsoTicket entity
     * @return The SsoTicketResponseDto
     */
    private SsoTicketResponseDto mapToDto(SsoTicket ssoTicket) {
        return SsoTicketResponseDto.builder()
                .id(ssoTicket.getId())
                .enterpriseId(ssoTicket.getEnterpriseId())
                .organizationId(ssoTicket.getOrganizationId())
                .adminEmail(ssoTicket.getAdminEmail())
                .ticketUrl(ssoTicket.getTicketUrl())
                .createdAt(ssoTicket.getCreatedAt())
                .build();
    }
}
