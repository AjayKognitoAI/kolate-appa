package ai.kolate.message_publisher.exception;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class ErrorResponse implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    private String status;

    private String message;

    private String error;

    @JsonProperty("error_description")
    private String errorDescription;

    /** empty constructor for Jackson deserialization. */
    public ErrorResponse() {
        // do nothing
    }

    /**
     * @param status
     * @param message
     */
    public ErrorResponse(String status, String message) {
        this.status = status;
        this.message = message;
    }
}
