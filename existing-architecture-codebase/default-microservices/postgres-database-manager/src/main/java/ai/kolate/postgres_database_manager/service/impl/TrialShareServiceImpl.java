package ai.kolate.postgres_database_manager.service.impl;

import ai.kolate.postgres_database_manager.dto.PageableRequest;
import ai.kolate.postgres_database_manager.dto.PagedResponse;
import ai.kolate.postgres_database_manager.dto.trialShare.ShareTrialRequest;
import ai.kolate.postgres_database_manager.dto.trialShare.TrialShareResponse;
import ai.kolate.postgres_database_manager.dto.trialShare.UserSummary;
import ai.kolate.postgres_database_manager.model.Notification;
import ai.kolate.postgres_database_manager.model.TrialShare;
import ai.kolate.postgres_database_manager.model.User;
import ai.kolate.postgres_database_manager.repository.TrialShareRepository;
import ai.kolate.postgres_database_manager.repository.UserRepository;
import ai.kolate.postgres_database_manager.service.TrialShareService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TrialShareServiceImpl implements TrialShareService {

    private final TrialShareRepository repository;
    private final UserRepository userRepository;

    private Map<String, UserSummary> buildUserSummaryMap(Set<String> auth0Ids) {
        if (auth0Ids.isEmpty()) return Collections.emptyMap();

        return userRepository.findByAuth0IdIn(new ArrayList<>(auth0Ids))
                .stream()
                .collect(Collectors.toMap(
                        User::getAuth0Id,
                        u -> UserSummary.builder()
                                .auth0Id(u.getAuth0Id())
                                .firstName(u.getFirstName())
                                .lastName(u.getLastName())
                                .email(u.getEmail())
                                .avatarUrl(u.getAvatarUrl())
                                .jobTitle(u.getJobTitle())
                                .build()
                ));
    }

    @Override
    public TrialShareResponse shareTrialWithTeam(
            UUID projectId,
            String trialSlug,
            ShareTrialRequest request) {
        String executionId = request.getExecutionId();
        String senderId = request.getSenderId();
        List<String> recipients  = request.getRecipients();

        if (senderId == null || senderId.isBlank()) {
            throw new IllegalArgumentException("senderId cannot be null or blank");
        }

        if (recipients == null || recipients.isEmpty()) {
            throw new IllegalArgumentException("Recipients list cannot be null or empty");
        }

        // Clean and dedupe recipients
        List<String> cleanRecipients = recipients.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .toList();

        if (cleanRecipients.isEmpty()) {
            throw new IllegalArgumentException("No valid recipients provided");
        }

        TrialShare share = TrialShare.builder()
                .projectId(projectId)
                .trialSlug(trialSlug)
                .executionId(executionId)
                .senderId(senderId)
                .recipients(cleanRecipients)
                .createdAt(Instant.now())
                .build();

        repository.save(share);

        // Fetch sender + recipients in a single query
        Set<String> auth0Ids = new HashSet<>();
        auth0Ids.add(senderId);
        auth0Ids.addAll(cleanRecipients);

        Map<String, UserSummary> userMap = buildUserSummaryMap(auth0Ids);

        UserSummary sender = userMap.getOrDefault(senderId, UserSummary.builder().auth0Id(senderId).build());

        List<UserSummary> recipientSummaries = cleanRecipients.stream()
                .map(r -> userMap.getOrDefault(r, UserSummary.builder().auth0Id(r).build()))
                .toList();

        return TrialShareResponse.builder()
                .id(share.getId())
                .projectId(projectId.toString())
                .trialSlug(trialSlug)
                .executionId(share.getExecutionId())
                .sender(sender)
                .recipients(recipientSummaries)
                .createdAt(share.getCreatedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<TrialShareResponse> getTrialShares(
            UUID projectId,
            String trialSlug,
            String userId,
            String direction,
            String q,
            Pageable pageable) {

        Page<TrialShare> page;
        boolean hasQuery = q != null && !q.isBlank();

        try {
            if ("sent".equalsIgnoreCase(direction)) {
                page = hasQuery
                        ? repository.searchSentByRecipientNameOrEmail(projectId, trialSlug, userId, q, pageable)
                        : repository.findByProjectIdAndTrialSlugAndSenderId(projectId, trialSlug, userId, pageable);
            } else if ("received".equalsIgnoreCase(direction)) {
                page = hasQuery
                        ? repository.searchReceivedBySenderNameOrEmail(projectId, trialSlug, userId, q, pageable)
                        : repository.findByProjectIdAndTrialSlugAndRecipient(projectId, trialSlug, userId, pageable);
            } else {
                throw new IllegalArgumentException("Invalid direction: " + direction + ". Must be 'sent' or 'received'");
            }

            // Handle empty results
            if (page.getContent().isEmpty()) {
                return PagedResponse.<TrialShareResponse>builder()
                        .content(Collections.emptyList())
                        .size(page.getSize())
                        .page(page.getNumber())
                        .totalElements(page.getTotalElements())
                        .totalPages(page.getTotalPages())
                        .first(page.isFirst())
                        .last(page.isLast())
                        .numberOfElements(page.getNumberOfElements())
                        .empty(true)
                        .build();
            }

            // Collect all IDs once
            Set<String> auth0Ids = page.getContent().stream()
                    .flatMap(ts -> {
                        Set<String> ids = new HashSet<>();
                        if (ts.getSenderId() != null) ids.add(ts.getSenderId());
                        if (ts.getRecipients() != null) ids.addAll(ts.getRecipients());
                        return ids.stream();
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

            Map<String, UserSummary> userMap = auth0Ids.isEmpty()
                    ? Collections.emptyMap()
                    : buildUserSummaryMap(auth0Ids);

            List<TrialShareResponse> responses = page.getContent().stream()
                    .map(ts -> {
                        UserSummary sender = userMap.getOrDefault(ts.getSenderId(),
                                UserSummary.builder().auth0Id(ts.getSenderId()).build());

                        List<UserSummary> recipientSummaries = Optional.ofNullable(ts.getRecipients())
                                .orElse(Collections.emptyList())
                                .stream()
                                .map(r -> userMap.getOrDefault(r, UserSummary.builder().auth0Id(r).build()))
                                .toList();

                        return TrialShareResponse.builder()
                                .id(ts.getId())
                                .projectId(ts.getProjectId().toString())
                                .trialSlug(ts.getTrialSlug())
                                .executionId(ts.getExecutionId())
                                .sender(sender)
                                .recipients(recipientSummaries)
                                .createdAt(ts.getCreatedAt())
                                .build();
                    })
                    .toList();

            return PagedResponse.<TrialShareResponse>builder()
                    .content(responses)
                    .size(page.getSize())
                    .page(page.getNumber())
                    .totalElements(page.getTotalElements())
                    .totalPages(page.getTotalPages())
                    .first(page.isFirst())
                    .last(page.isLast())
                    .numberOfElements(page.getNumberOfElements())
                    .empty(page.isEmpty())
                    .build();

        } catch (Exception e) {
            log.error("Error fetching trial shares for project {} trial {} user {} direction {}: {}",
                    projectId, trialSlug, userId, direction, e.getMessage(), e);

            // Return empty response instead of throwing exception
            return PagedResponse.<TrialShareResponse>builder()
                    .content(Collections.emptyList())
                    .size(pageable.getPageSize())
                    .page(pageable.getPageNumber())
                    .totalElements(0L)
                    .totalPages(0)
                    .first(true)
                    .last(true)
                    .numberOfElements(0)
                    .empty(true)
                    .build();
        }
    }
}

