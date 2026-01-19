package ai.kolate.user_manager.client;

import ai.kolate.user_manager.config.FeignClientConfig;
import ai.kolate.user_manager.dto.PagedResponse;
import ai.kolate.user_manager.model.User;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "${feign.clients.postgres-database-manager.name}",
        path = "${feign.clients.postgres-database-manager.path}",
        configuration = FeignClientConfig.class)
public interface UserFeignClient {
    @PostMapping("/v1/user")
    User createUser(@RequestBody User user);

    @GetMapping("/v1/user/{auth0Id}")
    User getUserByAuth0Id(@PathVariable String auth0Id);

    @GetMapping("v1/users/{organizationId}/organization")
    PagedResponse<User> getUsersByOrganizationId(
            @PathVariable String organizationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection);

    @GetMapping("/v1/users")
    PagedResponse<User> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection);

    @PutMapping("/v1/user/{id}")
    User updateUser(@PathVariable String id, @RequestBody User user);

    @GetMapping("/v1/users/search")
    PagedResponse<User> searchUsersByFullName(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection);

    @GetMapping("/v1/users/get-count")
    Long getUsersCount();
}
