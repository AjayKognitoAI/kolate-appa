package ai.kolate.enterprise_manager.client;

import ai.kolate.enterprise_manager.dto.auth0.Auth0OrganizationRequest;
import ai.kolate.enterprise_manager.dto.auth0.Auth0OrganizationResponse;
import ai.kolate.enterprise_manager.dto.auth0.Auth0SsoTicketRequest;
import ai.kolate.enterprise_manager.dto.auth0.Auth0SsoTicketResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "${feign.clients.auth-manager.name}",
        path = "${feign.clients.auth-manager.path}")
public interface AuthManagerClient {

    @PostMapping(
            path = "/v1/organizations",
            consumes = "application/json",
            produces = "application/json"
    )
    ResponseEntity<Auth0OrganizationResponse> createOrganization(@RequestBody Auth0OrganizationRequest request);

    @PostMapping(
            path = "/v1/self-service-profiles/{profileId}/sso-ticket",
            consumes = "application/json",
            produces = "application/json"
    )
    ResponseEntity<Auth0SsoTicketResponse> createSSOTicketWithProfileId(
            @PathVariable String profileId,
            @RequestBody Auth0SsoTicketRequest request);

    @PostMapping(
            path = "/v1/self-service-profiles/sso-ticket",
            consumes = "application/json",
            produces = "application/json"
    )
    ResponseEntity<Auth0SsoTicketResponse> createSSOTicket(@RequestBody Auth0SsoTicketRequest request);

    @DeleteMapping(
            path = "/v1/organization/{organization_id}/connection",
            consumes = "application/json",
            produces = "application/json"
    )
    ResponseEntity<String> deleteOrganizationConnection(@PathVariable("organization_id") String organizationId);
}
