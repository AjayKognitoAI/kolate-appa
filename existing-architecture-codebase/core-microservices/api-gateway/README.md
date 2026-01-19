# API Gateway Service

A Spring Cloud Gateway implementation that serves as the central entry point for the microservices architecture. This API Gateway handles routing, security, rate limiting, and circuit breaking functionalities.

## Features

- **Service Routing**: Routes requests to appropriate microservices using Spring Cloud Gateway
- **Security**: OAuth2/JWT-based authentication and authorization
- **Rate Limiting**: IP-based rate limiting using Redis
- **Circuit Breaking**: Resilience4j implementation for fault tolerance
- **Service Discovery**: Integration with Eureka for service discovery
- **CORS Support**: Configured for cross-origin requests
- **Monitoring**: Actuator endpoints for health checks and monitoring
- **Fallback Handling**: Custom fallback responses for service failures

## Configuration

The application is configured in `application.yml` with the following key settings:

- **Server Port**: 6000
- **Spring Cloud Gateway**: Routes and filters configuration
- **Redis**: For rate limiting
- **Security**: OAuth2/JWT settings with Auth0
- **Eureka Client**: Service discovery configuration
- **Circuit Breaker**: Resilience4j settings
- **CORS**: Cross-origin resource sharing settings


### Environment Variables

The following environment variables can be set to configure the application:

- `SPRING_PROFILES_ACTIVE`: Set the active Spring profile (default: dev)
- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)
- `EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE`: Eureka server URL (default: http://localhost:8761/eureka/)

## Docker

### Building the Docker Image

```bash
docker build -t api-gateway:1.0.0 .
```

### Running the Docker Container

```bash
docker run -d \
  -p 6000:6000 \
  -e SPRING_PROFILES_ACTIVE=dev \
  -e REDIS_HOST=redis \
  -e EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE=http://eureka-server:8761/eureka/ \
  --name api-gateway \
  api-gateway:1.0.0
```

## Testing

The API Gateway can be tested using:

```bash
# Health check
curl http://localhost:6000/actuator/health

# Info
curl http://localhost:6000/actuator/info
```



