package ai.kolate.postgres_database_manager.service.impl;

import ai.kolate.postgres_database_manager.config.DatasourceContext;
import ai.kolate.postgres_database_manager.dto.PageableRequest;
import ai.kolate.postgres_database_manager.dto.PagedResponse;
import ai.kolate.postgres_database_manager.model.User;
import ai.kolate.postgres_database_manager.model.enums.UserStatus;
import ai.kolate.postgres_database_manager.repository.UserRepository;
import ai.kolate.postgres_database_manager.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Implementation of the UserService interface.
 * Provides tenant-aware operations with caching for improved performance.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final DatasourceContext datasourceContext;

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public User createUser(User user) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Creating user with email: {} in tenant: {}", user.getEmail(), tenantId);

        // Ensure organizationId is set to current tenant
        user.setOrganizationId(tenantId);
        user.setStatus(UserStatus.ACTIVE);

        return userRepository.save(user);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public User updateUser(User user) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Updating user with ID: {} in tenant: {}", user.getId(), tenantId);

        Optional<User> existingUser = userRepository.findById(user.getId());
        if (existingUser.isPresent()) {
            // Verify user belongs to current tenant
            if (!tenantId.equals(existingUser.get().getOrganizationId())) {
                log.warn("Attempt to update user from different tenant. User belongs to: {}, current tenant: {}",
                        existingUser.get().getOrganizationId(), tenantId);
                throw new IllegalArgumentException("Cannot update user from a different organization");
            }
        }

        // Ensure organizationId is set to current tenant
        user.setOrganizationId(tenantId);

        return userRepository.save(user);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public Optional<User> getUserById(UUID id) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Fetching user with ID: {} from tenant: {}", id, tenantId);

        Optional<User> user = userRepository.findById(id);

        // Filter out users from other tenants
        if (user.isPresent() && !tenantId.equals(user.get().getOrganizationId())) {
            log.info("User found but belongs to different tenant: {}, current tenant: {}",
                    user.get().getOrganizationId(), tenantId);
            return Optional.empty();
        }

        return user;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public Optional<User> getUserByEmail(String email) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Fetching user with email: {} from tenant: {}", email, tenantId);

        Optional<User> user = userRepository.findByEmail(email);

        // Filter out users from other tenants
        if (user.isPresent() && !tenantId.equals(user.get().getOrganizationId())) {
            log.debug("User found but belongs to different tenant: {}, current tenant: {}",
                    user.get().getOrganizationId(), tenantId);
            return Optional.empty();
        }

        return user;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public Optional<User> getUserByAuth0Id(String auth0Id) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Fetching user with Auth0 ID: {} from tenant: {}", auth0Id, tenantId);

        Optional<User> user = userRepository.findByAuth0Id(auth0Id);

        // Filter out users from other tenants
        if (user.isPresent() && !tenantId.equals(user.get().getOrganizationId())) {
            log.info("User found but belongs to different tenant: {}, current tenant: {}",
                    user.get().getOrganizationId(), tenantId);
            return Optional.empty();
        }

        return user;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<User> getUsersByOrganizationId(String organizationId) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Fetching users for organization: {} from tenant: {}", organizationId, tenantId);

        // Only allow querying for the current tenant's users
        if (!tenantId.equals(organizationId)) {
            log.warn("Attempt to access users from different tenant: {}, current tenant: {}",
                    organizationId, tenantId);
            return List.of();
        }

        return userRepository.findByOrganizationId(organizationId);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public PagedResponse<User> getUsersByOrganizationIdPaginated(String organizationId, PageableRequest pageableRequest) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Fetching paginated users for organization: {} from tenant: {} - page: {}, size: {}", 
                organizationId, tenantId, pageableRequest.getPage(), pageableRequest.getSize());

        // Only allow querying for the current tenant's users
        if (!tenantId.equals(organizationId)) {
            log.warn("Attempt to access users from different tenant: {}, current tenant: {}",
                    organizationId, tenantId);
            return PagedResponse.<User>builder()
                    .content(List.of())
                    .page(pageableRequest.getPage())
                    .size(pageableRequest.getSize())
                    .totalElements(0)
                    .totalPages(0)
                    .first(true)
                    .last(true)
                    .numberOfElements(0)
                    .empty(true)
                    .build();
        }

        Pageable pageable = createPageable(pageableRequest);
        Page<User> userPage = userRepository.findByOrganizationId(organizationId, pageable);
        
        return createPagedResponse(userPage);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<User> getAllUsers() {
        String tenantId = datasourceContext.getTenantId();
        log.info("Fetching all users from tenant: {}", tenantId);

        // Return only users from the current tenant
        return userRepository.findByOrganizationId(tenantId);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public PagedResponse<User> getAllUsersPaginated(PageableRequest pageableRequest) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Fetching all paginated users from tenant: {} - page: {}, size: {}", 
                tenantId, pageableRequest.getPage(), pageableRequest.getSize());

        Pageable pageable = createPageable(pageableRequest);
        Page<User> userPage = userRepository.findByOrganizationId(tenantId, pageable);
        
        return createPagedResponse(userPage);
    }

    /**
     * Creates a Spring Data Pageable object from PageableRequest.
     *
     * @param pageableRequest The pagination request parameters
     * @return Pageable object for Spring Data
     */
    private Pageable createPageable(PageableRequest pageableRequest) {
        // Validate and set default values
        int page = Math.max(0, pageableRequest.getPage());
        int size = Math.min(Math.max(1, pageableRequest.getSize()), 100); // Max 100 items per page
        
        if (pageableRequest.getSortBy() != null && !pageableRequest.getSortBy().trim().isEmpty()) {
            Sort.Direction direction = "DESC".equalsIgnoreCase(pageableRequest.getSortDirection()) 
                    ? Sort.Direction.DESC 
                    : Sort.Direction.ASC;
            Sort sort = Sort.by(direction, pageableRequest.getSortBy());
            return PageRequest.of(page, size, sort);
        } else {
            // Default sort by createdAt DESC if no sort specified
            Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
            return PageRequest.of(page, size, sort);
        }
    }

    /**
     * Converts a Spring Data Page to our custom PagedResponse.
     *
     * @param page The Spring Data Page
     * @return Custom PagedResponse
     */
    private PagedResponse<User> createPagedResponse(Page<User> page) {
        return PagedResponse.<User>builder()
                .content(page.getContent())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .numberOfElements(page.getNumberOfElements())
                .empty(page.isEmpty())
                .build();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public void deleteUser(UUID id) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Deleting user with ID: {} from tenant: {}", id, tenantId);

        // Check if user belongs to current tenant before deletion
        Optional<User> user = userRepository.findById(id);
        if (user.isPresent()) {
            if (!tenantId.equals(user.get().getOrganizationId())) {
                log.info("Attempt to delete user from different tenant. User belongs to: {}, current tenant: {}",
                        user.get().getOrganizationId(), tenantId);
                throw new IllegalArgumentException("Cannot delete user from a different organization");
            }
            userRepository.deleteById(id);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<User> searchUsersByNamePaginated(String firstName, String lastName, PageableRequest pageableRequest) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Searching paginated users by name - firstName: {}, lastName: {} in tenant: {} - page: {}, size: {}",
                firstName, lastName, tenantId, pageableRequest.getPage(), pageableRequest.getSize());

        // Validate that at least one search parameter is provided
        if ((firstName == null || firstName.trim().isEmpty()) &&
                (lastName == null || lastName.trim().isEmpty())) {
            log.warn("Search attempted with empty parameters");
            return PagedResponse.<User>builder()
                    .content(List.of())
                    .page(pageableRequest.getPage())
                    .size(pageableRequest.getSize())
                    .totalElements(0)
                    .totalPages(0)
                    .first(true)
                    .last(true)
                    .numberOfElements(0)
                    .empty(true)
                    .build();
        }

        // Normalize search parameters
        String normalizedFirstName = (firstName != null && !firstName.trim().isEmpty()) ? firstName.trim() : null;
        String normalizedLastName = (lastName != null && !lastName.trim().isEmpty()) ? lastName.trim() : null;

        Pageable pageable = createPageable(pageableRequest);
        Page<User> userPage = userRepository.searchByFirstNameAndLastNameAndOrganizationId(
                normalizedFirstName, normalizedLastName, tenantId, pageable);

        return createPagedResponse(userPage);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public PagedResponse<User> searchUsersByFullNamePaginated(String searchTerm, PageableRequest pageableRequest) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Searching paginated users by full name - searchTerm: {} in tenant: {} - page: {}, size: {}",
                searchTerm, tenantId, pageableRequest.getPage(), pageableRequest.getSize());

        // Validate search parameter
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            log.warn("Search attempted with empty search term");
            return PagedResponse.<User>builder()
                    .content(List.of())
                    .page(pageableRequest.getPage())
                    .size(pageableRequest.getSize())
                    .totalElements(0)
                    .totalPages(0)
                    .first(true)
                    .last(true)
                    .numberOfElements(0)
                    .empty(true)
                    .build();
        }

        String normalizedSearchTerm = searchTerm.trim();
        Pageable pageable = createPageable(pageableRequest);
        Page<User> userPage = userRepository.searchByFullNameAndOrganizationId(
                normalizedSearchTerm, tenantId, pageable);

        return createPagedResponse(userPage);
    }

    @Override
    public Long userCountByOrganizationId(String organizationId){
        return userRepository.countByOrganizationId(organizationId);
    }
}
