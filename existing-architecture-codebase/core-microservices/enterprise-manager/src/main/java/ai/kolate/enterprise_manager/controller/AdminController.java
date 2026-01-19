package ai.kolate.enterprise_manager.controller;

import ai.kolate.enterprise_manager.dto.admin.AdminCreateDTO;
import ai.kolate.enterprise_manager.dto.admin.AdminDTO;
import ai.kolate.enterprise_manager.dto.admin.AdminResponseDTO;
import ai.kolate.enterprise_manager.dto.admin.AdminUpdateDTO;
import ai.kolate.enterprise_manager.model.enums.UserType;
import ai.kolate.enterprise_manager.service.AdminService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/enterprise-manager")
@Slf4j
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @PostMapping("/v1/admins")
    public ResponseEntity<AdminResponseDTO> createAdmin(@Valid @RequestBody AdminCreateDTO adminCreateDTO) {
        try {
            AdminDTO createdAdmin = adminService.createAdmin(adminCreateDTO);
            AdminResponseDTO response = AdminResponseDTO.builder()
                    .admins(Collections.singletonList(createdAdmin))
                    .message("Admin created successfully")
                    .success(true)
                    .build();
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (EntityNotFoundException e) {
            log.error("Error creating admin: {}", e.getMessage());
            AdminResponseDTO response = AdminResponseDTO.builder()
                    .message(e.getMessage())
                    .success(false)
                    .build();
            
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        } catch (IllegalArgumentException e) {
            log.error("Error creating admin: {}", e.getMessage());
            AdminResponseDTO response = AdminResponseDTO.builder()
                    .message(e.getMessage())
                    .success(false)
                    .build();
            
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            log.error("Unexpected error creating admin: {}", e.getMessage());
            AdminResponseDTO response = AdminResponseDTO.builder()
                    .message("Error creating admin: " + e.getMessage())
                    .success(false)
                    .build();
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/v1/admins")
    public ResponseEntity<AdminResponseDTO> updateAdmin(@Valid @RequestBody AdminUpdateDTO adminUpdateDTO) {
        try {
            AdminDTO updatedAdmin = adminService.updateAdmin(adminUpdateDTO);
            AdminResponseDTO response = AdminResponseDTO.builder()
                    .admins(Collections.singletonList(updatedAdmin))
                    .message("Admin updated successfully")
                    .success(true)
                    .build();
            
            return ResponseEntity.ok(response);
        } catch (EntityNotFoundException e) {
            log.error("Error updating admin: {}", e.getMessage());
            AdminResponseDTO response = AdminResponseDTO.builder()
                    .message(e.getMessage())
                    .success(false)
                    .build();
            
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        } catch (Exception e) {
            log.error("Unexpected error updating admin: {}", e.getMessage());
            AdminResponseDTO response = AdminResponseDTO.builder()
                    .message("Error updating admin: " + e.getMessage())
                    .success(false)
                    .build();
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/v1/admins/{id}")
    public ResponseEntity<AdminResponseDTO> getAdminById(@PathVariable UUID id) {
        return adminService.getAdminById(id)
                .map(admin -> {
                    AdminResponseDTO response = AdminResponseDTO.builder()
                            .admins(Collections.singletonList(admin))
                            .message("Admin retrieved successfully")
                            .success(true)
                            .build();
                    
                    return ResponseEntity.ok(response);
                })
                .orElseGet(() -> {
                    AdminResponseDTO response = AdminResponseDTO.builder()
                            .message("Admin not found with ID: " + id)
                            .success(false)
                            .build();
                    
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
                });
    }

    @GetMapping("/v1/admins/auth0/{auth0Id}")
    public ResponseEntity<AdminResponseDTO> getAdminByAuth0Id(@PathVariable String auth0Id) {
        return adminService.getAdminByAuth0Id(auth0Id)
                .map(admin -> {
                    AdminResponseDTO response = AdminResponseDTO.builder()
                            .admins(Collections.singletonList(admin))
                            .message("Admin retrieved successfully")
                            .success(true)
                            .build();
                    
                    return ResponseEntity.ok(response);
                })
                .orElseGet(() -> {
                    AdminResponseDTO response = AdminResponseDTO.builder()
                            .message("Admin not found with Auth0 ID: " + auth0Id)
                            .success(false)
                            .build();
                    
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
                });
    }

    @GetMapping("/v1/admins/email/{email}")
    public ResponseEntity<AdminResponseDTO> getAdminByEmail(@PathVariable String email) {
        return adminService.getAdminByEmail(email)
                .map(admin -> {
                    AdminResponseDTO response = AdminResponseDTO.builder()
                            .admins(Collections.singletonList(admin))
                            .message("Admin retrieved successfully")
                            .success(true)
                            .build();
                    
                    return ResponseEntity.ok(response);
                })
                .orElseGet(() -> {
                    AdminResponseDTO response = AdminResponseDTO.builder()
                            .message("Admin not found with email: " + email)
                            .success(false)
                            .build();
                    
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
                });
    }

    @GetMapping("/v1/admins/enterprise/{enterpriseId}")
    public ResponseEntity<AdminResponseDTO> getAdminsByEnterpriseId(@PathVariable UUID enterpriseId) {
        List<AdminDTO> admins = adminService.getAdminsByEnterpriseId(enterpriseId);
        AdminResponseDTO response = AdminResponseDTO.builder()
                .admins(admins)
                .message(admins.isEmpty() ? "No admins found for enterprise ID: " + enterpriseId : "Admins retrieved successfully")
                .success(true)
                .build();
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/v1/admins/organization/{organizationId}")
    public ResponseEntity<AdminResponseDTO> getAdminsByOrganizationId(@PathVariable String organizationId) {
        List<AdminDTO> admins = adminService.getAdminsByOrganizationId(organizationId);
        AdminResponseDTO response = AdminResponseDTO.builder()
                .admins(admins)
                .message(admins.isEmpty() ? "No admins found for organization ID: " + organizationId : "Admins retrieved successfully")
                .success(true)
                .build();
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/v1/admins/type/{userType}")
    public ResponseEntity<AdminResponseDTO> getAdminsByUserType(@PathVariable UserType userType) {
        List<AdminDTO> admins = adminService.getAdminsByUserType(userType);
        AdminResponseDTO response = AdminResponseDTO.builder()
                .admins(admins)
                .message(admins.isEmpty() ? "No admins found for user type: " + userType : "Admins retrieved successfully")
                .success(true)
                .build();
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/v1/admins/enterprise/{enterpriseId}/type/{userType}")
    public ResponseEntity<AdminResponseDTO> getAdminsByEnterpriseIdAndUserType(
            @PathVariable UUID enterpriseId,
            @PathVariable UserType userType) {
        List<AdminDTO> admins = adminService.getAdminsByEnterpriseIdAndUserType(enterpriseId, userType);
        AdminResponseDTO response = AdminResponseDTO.builder()
                .admins(admins)
                .message(admins.isEmpty() ? 
                        "No admins found for enterprise ID: " + enterpriseId + " and user type: " + userType : 
                        "Admins retrieved successfully")
                .success(true)
                .build();
        
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/v1/admins/{id}")
    public ResponseEntity<AdminResponseDTO> deleteAdminById(@PathVariable UUID id) {
        boolean deleted = adminService.deleteAdminById(id);
        
        if (deleted) {
            AdminResponseDTO response = AdminResponseDTO.builder()
                    .message("Admin deleted successfully")
                    .success(true)
                    .build();
            
            return ResponseEntity.ok(response);
        } else {
            AdminResponseDTO response = AdminResponseDTO.builder()
                    .message("Admin not found with ID: " + id)
                    .success(false)
                    .build();
            
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }

    @GetMapping("/v1/admins/exists/email/{email}/enterprise/{enterpriseId}")
    public ResponseEntity<AdminResponseDTO> existsByEmailAndEnterpriseId(
            @PathVariable String email,
            @PathVariable UUID enterpriseId) {
        boolean exists = adminService.existsByEmailAndEnterpriseId(email, enterpriseId);
        
        AdminResponseDTO response = AdminResponseDTO.builder()
                .message(exists ? "Admin exists with the provided email and enterprise ID" : "Admin does not exist with the provided email and enterprise ID")
                .success(true)
                .build();
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/v1/admins/exists/auth0/{auth0Id}")
    public ResponseEntity<AdminResponseDTO> existsByAuth0Id(@PathVariable String auth0Id) {
        boolean exists = adminService.existsByAuth0Id(auth0Id);
        
        AdminResponseDTO response = AdminResponseDTO.builder()
                .message(exists ? "Admin exists with the provided Auth0 ID" : "Admin does not exist with the provided Auth0 ID")
                .success(true)
                .build();
        
        return ResponseEntity.ok(response);
    }
}
