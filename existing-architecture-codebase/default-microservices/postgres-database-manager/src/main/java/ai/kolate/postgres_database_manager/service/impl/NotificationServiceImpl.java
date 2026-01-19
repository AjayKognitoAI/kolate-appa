package ai.kolate.postgres_database_manager.service.impl;

import ai.kolate.postgres_database_manager.dto.PagedResponse;
import ai.kolate.postgres_database_manager.model.Notification;
import ai.kolate.postgres_database_manager.repository.NotificationRepository;
import ai.kolate.postgres_database_manager.repository.UserRepository;
import ai.kolate.postgres_database_manager.service.NotificationService;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;


@Slf4j
@Service
public class NotificationServiceImpl implements NotificationService {

    @Autowired
    private NotificationRepository notiRepo;

    @Autowired
    private UserRepository userRepository;

    @Override
    public Notification createNotification(Notification notification) {
        notification.setTimestamp(LocalDateTime.now());
        return notiRepo.save(notification);
    }

    @Override
    @Transactional
    public void readNotification(UUID id) {
        Notification notification = notiRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notification with id " + id + " not found"));

        notification.setStatus("READ");
        notiRepo.save(notification);
    }

    @Override
    @Transactional
    public void readAllNotificationByUser(String recipient) {
        int updated = notiRepo.markAllAsReadByRecipient(recipient);
        // optional: log updated
         log.info("Marked {} notifications as read for {}", updated, recipient);
    }

    @Override
    public void deleteNotification(UUID id) {
        notiRepo.deleteById(id);
    }

    @Override
    public PagedResponse<Notification> getNoifications(String recipient, Pageable pageable) {
        Page<Notification> page = notiRepo.findAllForRecipientOrderByTimestampNative(recipient, pageable);
        return convertToPagedResponse(page);
    }

    @Override
    public Long getNotificationCount(String recipient) {
        return notiRepo.countByRecipientAndStatus(recipient, "UNREAD");
    }

    private PagedResponse<Notification> convertToPagedResponse(Page<Notification> notificationPage) {
        List<Notification> content = notificationPage.getContent(); // Fixed: use getContent() instead of get().toList()

        return PagedResponse.<Notification>builder() // Fixed: Use Notification instead of ProjectSummaryResponse
                .content(content)
                .size(notificationPage.getSize())
                .page(notificationPage.getNumber())
                .totalElements(notificationPage.getTotalElements())
                .totalPages(notificationPage.getTotalPages())
                .first(notificationPage.isFirst())
                .last(notificationPage.isLast())
                .numberOfElements(notificationPage.getNumberOfElements()) // Added: missing field
                .empty(notificationPage.isEmpty())
                .build();
    }
}
