package ai.kolate.postgres_database_manager.service;

import ai.kolate.postgres_database_manager.dto.PagedResponse;
import ai.kolate.postgres_database_manager.model.Notification;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface NotificationService  {
    Notification  createNotification(Notification notification);

    void  readNotification(UUID id);

    void  readAllNotificationByUser(String recipient);

    void deleteNotification(UUID id);

    PagedResponse<Notification> getNoifications(String recipient, Pageable pageable);

    Long getNotificationCount(String recipient);
}
