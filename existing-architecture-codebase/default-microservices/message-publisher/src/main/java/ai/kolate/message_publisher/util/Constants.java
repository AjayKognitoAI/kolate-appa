package ai.kolate.message_publisher.util;

import org.springframework.http.HttpStatus;

public class Constants {
    /** Constant value for success status. */
    public static final String SUCCESS = "SUCCESS";

    /** Constant value for failure status. */
    public static final String FAILED = "FAILED";

    public static final String USER_ID = "user-id";

    public static final String HTTP_SERVER_ERROR_EXCEPTION = "HttpServerErrorException";

    public static final String HTTP_CLIENT_ERROR_EXCEPTION = "HttpClientErrorException";

    public static final String INVALID_DATA_EXCEPTION = "InvalidDataException";

    public static final String INTERNAL_SERVICE_EXCEPTION = "InternalServiceException";

    public static final String INVALID_REQUEST_EXCEPTION = "InvalidRequestException";

    public static final String STATUS_BAD_REQUEST = HttpStatus.BAD_REQUEST.name();

    public static final String STATUS_INTERNAL_SERVER_ERROR = HttpStatus.INTERNAL_SERVER_ERROR.name();
}
