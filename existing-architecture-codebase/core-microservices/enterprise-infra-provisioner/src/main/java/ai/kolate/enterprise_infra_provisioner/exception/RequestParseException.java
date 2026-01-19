package ai.kolate.enterprise_infra_provisioner.exception;

import java.io.Serial;

public class RequestParseException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    public RequestParseException(String message) {
        super(message);
    }

    public RequestParseException(String message, Throwable cause) {
        super(message, cause);
    }
}
