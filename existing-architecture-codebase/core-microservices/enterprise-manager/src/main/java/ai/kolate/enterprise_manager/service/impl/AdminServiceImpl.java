package ai.kolate.enterprise_manager.service.impl;

import ai.kolate.enterprise_manager.dto.admin.AdminCreateDTO;
import ai.kolate.enterprise_manager.dto.admin.AdminDTO;
import ai.kolate.enterprise_manager.dto.admin.AdminUpdateDTO;
import ai.kolate.enterprise_manager.dto.listener.CreateInvitedAdminRequestDTO;
import ai.kolate.enterprise_manager.dto.listener.UpdateAdminRequestDTO;
import ai.kolate.enterprise_manager.model.Admin;
import ai.kolate.enterprise_manager.model.Enterprise;
import ai.kolate.enterprise_manager.model.enums.UserType;
import ai.kolate.enterprise_manager.repository.AdminRepository;
import ai.kolate.enterprise_manager.repository.EnterpriseRepository;
import ai.kolate.enterprise_manager.service.AdminService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {

    private final AdminRepository adminRepository;
    private final EnterpriseRepository enterpriseRepository;

    @Override
    @Transactional
    public AdminDTO createAdmin(AdminCreateDTO adminCreateDTO) {
        log.info("Creating admin with email: {}", adminCreateDTO.getEmail());
        
        Enterprise enterprise = enterpriseRepository.findById(adminCreateDTO.getEnterpriseId())
                .orElseThrow(() -> new EntityNotFoundException("Enterprise not found with ID: " + adminCreateDTO.getEnterpriseId()));
        
        // Check if admin already exists with the same email for this enterprise
        if (adminRepository.existsByEmailAndEnterpriseId(adminCreateDTO.getEmail(), adminCreateDTO.getEnterpriseId())) {
            throw new IllegalArgumentException("Admin with email " + adminCreateDTO.getEmail() + " already exists for this enterprise");
        }
        
        Admin admin = Admin.builder()
                .firstName(adminCreateDTO.getFirstName())
                .lastName(adminCreateDTO.getLastName())
                .email(adminCreateDTO.getEmail())
                .userType(adminCreateDTO.getUserType())
                .organizationId(adminCreateDTO.getOrganizationId())
                .enterprise(enterprise)
                .build();
        
        Admin savedAdmin = adminRepository.save(admin);
        log.info("Admin created successfully with ID: {}", savedAdmin.getId());
        
        return mapToDTO(savedAdmin);
    }

    @Override
    @Transactional
    public AdminDTO updateAdmin(AdminUpdateDTO adminUpdateDTO) {
        log.info("Updating admin with ID: {}", adminUpdateDTO.getId());
        
        Admin admin = adminRepository.findById(adminUpdateDTO.getId())
                .orElseThrow(() -> new EntityNotFoundException("Admin not found with ID: " + adminUpdateDTO.getId()));
        
        if (adminUpdateDTO.getFirstName() != null) {
            admin.setFirstName(adminUpdateDTO.getFirstName());
        }
        
        if (adminUpdateDTO.getLastName() != null) {
            admin.setLastName(adminUpdateDTO.getLastName());
        }
        
        if (adminUpdateDTO.getEmail() != null) {
            admin.setEmail(adminUpdateDTO.getEmail());
        }
        
        if (adminUpdateDTO.getUserType() != null) {
            admin.setUserType(adminUpdateDTO.getUserType());
        }
        
        if (adminUpdateDTO.getOrganizationId() != null) {
            admin.setOrganizationId(adminUpdateDTO.getOrganizationId());
        }
        
        Admin updatedAdmin = adminRepository.save(admin);
        log.info("Admin updated successfully with ID: {}", updatedAdmin.getId());
        
        return mapToDTO(updatedAdmin);
    }

    @Override
    @Transactional
    public AdminDTO createAdminByOrganizationId(CreateInvitedAdminRequestDTO request) {
        log.info("Creating admin record for {} in organization {}", request.getAdminEmail(), request.getOrganizationId());

        Enterprise enterprise = enterpriseRepository.findByOrganizationId(request.getOrganizationId())
                .orElseThrow(() -> new EntityNotFoundException("No enterprise found for organization id " + request.getOrganizationId()));

        Admin admin = Admin.builder()
                .firstName(StringUtils.isEmpty(request.getFirstName()) ? "" : request.getFirstName())
                .lastName(StringUtils.isEmpty(request.getLastName()) ? "" : request.getLastName())
                .auth0Id(StringUtils.isEmpty(request.getAdminAuth0Id()) ? "" : request.getAdminAuth0Id())
                .email(request.getAdminEmail())
                .userType(UserType.ORGANIZATION_ADMIN)
                .organizationId(request.getOrganizationId())
                .enterprise(enterprise)
                .build();

        Admin savedAdmin = adminRepository.save(admin);
        log.info("Admin created successfully with ID: {}", savedAdmin.getId());

        return mapToDTO(savedAdmin);
    }

    @Override
    @Transactional
    public AdminDTO updateAdminByEmail(UpdateAdminRequestDTO adminUpdateDTO) {
        log.info("Updating admin with email: {}", adminUpdateDTO.getAdminEmail());

        Admin admin = adminRepository.findByEmail(adminUpdateDTO.getAdminEmail())
                .orElseThrow(() -> new EntityNotFoundException("Admin not found with email: " + adminUpdateDTO.getAdminEmail()));

        if (adminUpdateDTO.getFirstName() != null) {
            admin.setFirstName(adminUpdateDTO.getFirstName());
        }

        if (adminUpdateDTO.getLastName() != null) {
            admin.setLastName(adminUpdateDTO.getLastName());
        }

        if (adminUpdateDTO.getOrganizationId() != null) {
            admin.setOrganizationId(adminUpdateDTO.getOrganizationId());
        }

        if (adminUpdateDTO.getAuth0Id() != null) {
            admin.setAuth0Id(adminUpdateDTO.getAuth0Id());
        }

        admin.setUserType(UserType.ORGANIZATION_ADMIN);

        Admin updatedAdmin = adminRepository.save(admin);
        log.info("Admin updated successfully with ID: {}", updatedAdmin.getId());

        return mapToDTO(updatedAdmin);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AdminDTO> getAdminById(UUID id) {
        log.info("Getting admin by ID: {}", id);
        return adminRepository.findById(id).map(this::mapToDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AdminDTO> getAdminByAuth0Id(String auth0Id) {
        log.info("Getting admin by Auth0 ID: {}", auth0Id);
        return adminRepository.findByAuth0Id(auth0Id).map(this::mapToDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AdminDTO> getAdminByEmail(String email) {
        log.info("Getting admin by email: {}", email);
        return adminRepository.findByEmail(email).map(this::mapToDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdminDTO> getAdminsByEnterpriseId(UUID enterpriseId) {
        log.info("Getting admins by enterprise ID: {}", enterpriseId);
        return adminRepository.findByEnterpriseId(enterpriseId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdminDTO> getAdminsByOrganizationId(String organizationId) {
        log.info("Getting admins by organization ID: {}", organizationId);
        return adminRepository.findByOrganizationId(organizationId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdminDTO> getAdminsByUserType(UserType userType) {
        log.info("Getting admins by user type: {}", userType);
        return adminRepository.findByUserType(userType).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdminDTO> getAdminsByEnterpriseIdAndUserType(UUID enterpriseId, UserType userType) {
        log.info("Getting admins by enterprise ID: {} and user type: {}", enterpriseId, userType);
        return adminRepository.findByEnterpriseIdAndUserType(enterpriseId, userType).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public boolean deleteAdminById(UUID id) {
        log.info("Deleting admin by ID: {}", id);
        if (adminRepository.existsById(id)) {
            adminRepository.deleteById(id);
            log.info("Admin deleted successfully with ID: {}", id);
            return true;
        }
        log.info("Admin not found with ID: {}", id);
        return false;
    }

    @Override
    public boolean deleteAdminByEmail(String email) {
        return adminRepository.findByEmail(email)
                .map(admin -> {
                    adminRepository.delete(admin);
                    log.info("Deleted admin with email: {}", email);
                    return true;
                })
                .orElseGet(() -> {
                    log.info("No admin found with email: {}", email);
                    return false;
                });
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByEmailAndEnterpriseId(String email, UUID enterpriseId) {
        log.info("Checking if admin exists by email: {} and enterprise ID: {}", email, enterpriseId);
        return adminRepository.existsByEmailAndEnterpriseId(email, enterpriseId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByAuth0Id(String auth0Id) {
        log.info("Checking if admin exists by Auth0 ID: {}", auth0Id);
        return adminRepository.existsByAuth0Id(auth0Id);
    }
    
    private AdminDTO mapToDTO(Admin admin) {
        return AdminDTO.builder()
                .id(admin.getId())
                .auth0Id(admin.getAuth0Id())
                .firstName(admin.getFirstName())
                .lastName(admin.getLastName())
                .email(admin.getEmail())
                .userType(admin.getUserType())
                .organizationId(admin.getOrganizationId())
                .enterpriseId(admin.getEnterprise().getId())
                .enterpriseName(admin.getEnterprise().getName())
                .build();
    }
}
