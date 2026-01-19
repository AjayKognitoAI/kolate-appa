package ai.kolate.user_manager.dto.kafka;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublishMessageRequest implements Serializable {

    /** Unique identifier for serialization. */
    @Serial
    private static final long serialVersionUID = 6477316466097974184L;

    private String kafkaTopicName;

    @NotNull(message = "Message cannot be null")
    @NotBlank(message = "Message cannot be blank")
    private String message;
}

