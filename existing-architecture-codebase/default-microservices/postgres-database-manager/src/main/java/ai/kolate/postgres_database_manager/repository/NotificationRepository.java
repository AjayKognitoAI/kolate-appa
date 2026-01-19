package ai.kolate.postgres_database_manager.repository;

import ai.kolate.postgres_database_manager.model.Notification;
import feign.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    @Query(value = "SELECT * FROM notifications WHERE recipient = :recipient " +
            "ORDER BY timestamp DESC",
            countQuery = "SELECT count(*) FROM notifications WHERE recipient = :recipient",
            nativeQuery = true)
    Page<Notification> findAllForRecipientOrderByTimestampNative(@Param("recipient") String recipient, Pageable pageable);

    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE notifications SET status = 'READ' WHERE recipient = :recipient AND status = 'UNREAD'", nativeQuery = true)
    int markAllAsReadByRecipient(@Param("recipient") String recipient);


    long countByRecipientAndStatus(String recipient, String status);
}

