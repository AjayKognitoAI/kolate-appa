package ai.kolate.user_manager.service;

import ai.kolate.user_manager.dto.ChangeRoleRequestDTO;
import ai.kolate.user_manager.dto.CreateUserRequestDTO;
import ai.kolate.user_manager.dto.InviteUserRequestDTO;
import ai.kolate.user_manager.dto.InviteUserResponseDTO;
import ai.kolate.user_manager.dto.PagedResponse;
import ai.kolate.user_manager.dto.UserResponseDTO;
import ai.kolate.user_manager.dto.auth.RoleResponseDTO;

import java.util.List;

public interface UserService {
    UserResponseDTO createUser(CreateUserRequestDTO request);
    UserResponseDTO getUserByAuth0Id(String auth0Id);
    InviteUserResponseDTO inviteUserToOrganization(InviteUserRequestDTO request, String organizationId);
    PagedResponse<UserResponseDTO> getUsersByOrganizationId(String organizationId, int page, int size, String sortBy, String sortDirection);
    PagedResponse<UserResponseDTO> getAllUsers(int page, int size, String sortBy, String sortDirection);
    List<RoleResponseDTO> getAllRoles();
    void changeUserRole(ChangeRoleRequestDTO request, String organizationId);
    UserResponseDTO blockAndUnblockUser(String action, String auth0Id);
    PagedResponse<UserResponseDTO> searchUsersByFullName(String query, int page, int size, String sortBy, String sortDirection);
    Long getUsersCount();
}
