package ai.kolate.user_manager.client;

import ai.kolate.user_manager.config.FeignClientConfig;
import ai.kolate.user_manager.dto.auth.AssignRolesRequestDTO;
import ai.kolate.user_manager.dto.auth.Auth0BlockUnblockUserRequestDTO;
import ai.kolate.user_manager.dto.auth.InvitationRequestDTO;
import ai.kolate.user_manager.dto.auth.InvitationResponseDTO;
import ai.kolate.user_manager.dto.auth.RoleResponseDTO;
import jakarta.validation.Valid;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

@FeignClient(name = "${feign.clients.auth-manager.name}",
        path = "${feign.clients.auth-manager.path}",
        configuration = FeignClientConfig.class)
public interface AuthManagerClient {
    
    @PostMapping("/v1/user/organizations/{organization_id}/invitations")
    ResponseEntity<InvitationResponseDTO> sendOrganizationInvitation(
            @PathVariable("organization_id") String organizationId,
            @RequestBody InvitationRequestDTO invitationRequest);

    @PostMapping("/v1/user/roles")
    ResponseEntity<Void> assignRolesToOrganizationMember(
            @Valid @RequestBody AssignRolesRequestDTO rolesRequest);

    @PutMapping("/v1/user/roles")
    public ResponseEntity<Void> changeRolesOfOrganizationMember(
            @Valid @RequestBody AssignRolesRequestDTO rolesRequest );

    @GetMapping("/v1/roles")
    List<RoleResponseDTO> getRoles();

    @PutMapping("/v1/user")
    public ResponseEntity<Map<String, String>> blockAndUnblockUser(
            @RequestParam String action,
            @Valid @RequestBody Auth0BlockUnblockUserRequestDTO request);
}
