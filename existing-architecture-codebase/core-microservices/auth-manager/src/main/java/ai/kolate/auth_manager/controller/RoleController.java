package ai.kolate.auth_manager.controller;

import ai.kolate.auth_manager.dto.RoleResponseDTO;
import ai.kolate.auth_manager.service.Auth0RoleService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth-manager")
public class RoleController {
    private static final Logger logger = LoggerFactory.getLogger(RoleController.class);

    private final Auth0RoleService roleService;

    public RoleController(Auth0RoleService roleService) {
        this.roleService = roleService;
    }

    /**
     * Get all roles from Auth0
     *
     * @return List of RoleResponseDTO containing all available roles
     */
    @GetMapping("/v1/roles")
    public ResponseEntity<List<RoleResponseDTO>> getRoles() {
        logger.info("Getting all roles from Auth0");

        try {
            List<RoleResponseDTO> roles = roleService.getRoles();
            return ResponseEntity.ok(roles);
        } catch (Exception e) {
            logger.error("Failed to get roles from Auth0", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
