package ai.kolate.message_publisher.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.io.Serial;
import java.io.Serializable;

@Getter
@Setter
@ToString
public class PublishMessageRequest implements Serializable {

    /** Unique identifier for serialization. */
    @Serial
    private static final long serialVersionUID = 6477316466097974184L;

//    @NotNull(message = "Kafka topic name cannot be null")
//    @NotBlank(message = "Kafka topic name cannot be blank")
    private String kafkaTopicName;

    @NotNull(message = "Message cannot be null")
    @NotBlank(message = "Message cannot be blank")
    private String message;
}
