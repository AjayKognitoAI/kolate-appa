package ai.kolate.postgres_database_manager.controller;

import ai.kolate.postgres_database_manager.config.DatasourceContext;
import ai.kolate.postgres_database_manager.dto.PageableRequest;
import ai.kolate.postgres_database_manager.dto.PagedResponse;
import ai.kolate.postgres_database_manager.model.Notification;
import ai.kolate.postgres_database_manager.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;


@RestController
@RequestMapping("/internal/postgres-database-manager")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;
    private final DatasourceContext datasourceContext;

    @PostMapping("/v1/notification")
    public ResponseEntity<?> createProject(@Valid @RequestBody Notification request) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to create notification: {} for tenant: {}", request, tenantId);

        try {
            Notification createdNotification = notificationService.createNotification(request);
            return new ResponseEntity<>(createdNotification, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            log.warn("Notification saving failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @GetMapping("/v1/notification/{recipient}")
    public ResponseEntity<?> getAllNotifications(
            @PathVariable String recipient,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get all projects for tenant: {} - page: {}, size: {}", tenantId, page, size);

        PageableRequest pageableRequest = PageableRequest.builder()
                .page(page)
                .size(size)
                .sortBy(sortBy)
                .sortDirection(sortDirection)
                .build();

        try {
            PagedResponse<Notification> notifications = notificationService.getNoifications(recipient, pageableRequest.toPageable());
            return new ResponseEntity<>(notifications, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            log.warn("Getting notification failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @GetMapping("/v1/notification/{recipient}/unread-count")
    public ResponseEntity<?> getAllNotificationCount(
            @PathVariable String recipient) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to get all projects for tenant: {} - recipient: {}", tenantId, recipient);



        try {
            Long count = notificationService.getNotificationCount(recipient);
            return new ResponseEntity<>(count, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            log.warn("Getting notification failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PutMapping("/v1/notification/{id}/read")
    public ResponseEntity<?> unreadNotifications(@Valid @PathVariable UUID id) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to unread notification: {} for tenant: {}", id, tenantId);

        try {
            notificationService.readNotification(id);
            return new ResponseEntity<>("Notification marked as read", HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            log.warn("unread marking notification failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PutMapping("/v1/notification/{recipient}/readAll")
    public ResponseEntity<?> unreadAllNotifications(@Valid @PathVariable String recipient) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to unread all notification: {} for tenant: {}", recipient, tenantId);

        try {
            notificationService.readAllNotificationByUser(recipient);
            return new ResponseEntity<>("All notification marked as read", HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            log.warn("unread marking all notification failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }


    @DeleteMapping("/v1/notification/{id}")
    public ResponseEntity<?> deleteNotifications(@Valid @PathVariable UUID id) {
        String tenantId = datasourceContext.getTenantId();
        log.info("Received request to delete notification: {} for tenant: {}", id, tenantId);

        try {
            notificationService.deleteNotification(id);
            return new ResponseEntity<>("Notification deleted successfully", HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            log.warn("deleting notification failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

}