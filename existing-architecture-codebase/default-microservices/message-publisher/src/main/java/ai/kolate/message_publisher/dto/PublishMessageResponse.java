package ai.kolate.message_publisher.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.io.Serial;
import java.io.Serializable;

@Getter
@Setter
@AllArgsConstructor
@ToString
public class PublishMessageResponse implements Serializable {

    /** Unique identifier for serialization. */
    @Serial
    private static final long serialVersionUID = -279093820607020760L;

    private String status;

    private String message;
}
