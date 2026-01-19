package ai.kolate.message_publisher.exception;

import java.io.Serial;

public class InternalServiceException extends RuntimeException {

    /** Default serial version UID. */
    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * Constructor with a message.
     *
     * @param message The error message.
     */
    public InternalServiceException(String message) {
        super(message);
    }
}
