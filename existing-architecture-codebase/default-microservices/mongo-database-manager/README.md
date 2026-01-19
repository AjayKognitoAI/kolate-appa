# MongoDB Database Manager Microservice

A Spring Boot microservice that provides tenant-aware MongoDB operations. This service acts as a database proxy, dynamically routing MongoDB connections based on tenant context and retrieving datasource configurations from an Enterprise Manager service.

## Features

- **Tenant-Aware MongoDB Operations**: Automatic database switching based on organization ID
- **Dynamic Datasource Resolution**: Fetches MongoDB connection details from Enterprise Manager service
- **Connection Pooling & Caching**: Efficient connection management with local and Redis caching
- **RESTful API**: Complete CRUD operations with standardized response format
- **Security**: Basic authentication and authorization
- **Health Checks**: Built-in health monitoring and actuator endpoints
- **Service Discovery**: Eureka client integration

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │───▶│ MongoDB Manager  │───▶│ Enterprise Mgr  │
│                 │    │   (This Service) │    │    Service      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  MongoDB Cluster │
                       │  (Multi-tenant)  │
                       └─────────────────┘
```

## Configuration

### Application Properties (`application.yml`)

```yaml
server:
  port: 8083

spring:
  application:
    name: mongo-database-manager
  
  # Default MongoDB Configuration
  data:
    mongodb:
      uri: mongodb://localhost:27017
      database: default_db

# Feign Client Configuration
feign:
  clients:
    enterprise-manager:
      name: enterprise-manager
      path: /api
      url: http://localhost:8081

# Eureka Configuration
eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
```

### MongoDB Connection String Format

The service supports MongoDB connection strings in this format:
```
mongodb://username:password@host:port/database?authSource=admin
```

Example:
```
mongodb://dbuser123:securePassword123@10.0.8.57:27020/kolate_db_123?authSource=admin
```

## API Endpoints

### MongoDB Operations

#### Health Check
```
GET /api/v1/mongo/health
```

#### Get Collections
```
GET /api/v1/mongo/collections
Headers: org-id: {organizationId}
```

#### Get Documents
```
GET /api/v1/mongo/collections/{collectionName}/documents
Headers: org-id: {organizationId}
```

#### Insert Document
```
POST /api/v1/mongo/collections/{collectionName}/documents
Headers: org-id: {organizationId}
Body: {document object}
```

#### Get Document Count
```
GET /api/v1/mongo/collections/{collectionName}/count
Headers: org-id: {organizationId}
```

#### Test Connection
```
GET /api/v1/mongo/test-connection
Headers: org-id: {organizationId}
```

### User Management (Example Implementation)

#### Create User
```
POST /api/v1/users
Headers: org-id: {organizationId}
Body: {
  "username": "john.doe",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "active": true
}
```

#### Get All Users
```
GET /api/v1/users
Headers: org-id: {organizationId}
```

#### Get User by ID
```
GET /api/v1/users/{userId}
Headers: org-id: {organizationId}
```

#### Create User for Specific Tenant
```
POST /api/v1/users/tenant/{tenantId}
Body: {user object}
```

## Tenant Context

The service uses the `org-id` header to determine the tenant context:

```http
GET /api/v1/users
org-id: organization-123
```

This automatically routes the request to the appropriate MongoDB database for `organization-123`.

## Enterprise Manager Integration

The service calls the Enterprise Manager to fetch datasource details:

```
GET /api/v1/datasources/organization/{organizationId}/type/mongodb
```

Expected response format:
```json
{
  "status": "SUCCESS",
  "message": "Datasource found",
  "data": {
    "id": "uuid",
    "organizationId": "org-123",
    "connectionString": "mongodb://user:pass@host:port/db?authSource=admin",
    "databaseName": "org_123_db",
    "maxPoolSize": 20,
    "minPoolSize": 5,
    "connectionTimeoutMs": 10000
  }
}
```

## How It Works

1. **Request Reception**: Client sends request with `org-id` header
2. **Tenant Context Setup**: `MongoTenantContextFilter` extracts tenant ID
3. **Datasource Resolution**: `MongoDatasourceResolver` gets/creates MongoDB template
4. **Enterprise Manager Call**: Fetches datasource config if not cached
5. **Connection Creation**: Creates MongoDB client with proper settings
6. **Operation Execution**: Performs requested MongoDB operation
7. **Response**: Returns standardized JSON response

## Caching Strategy

- **Local Cache**: In-memory caching of MongoTemplate instances
- **Redis Cache**: Metadata caching for datasource configurations
- **Connection Pooling**: MongoDB driver-level connection pooling

## Error Handling

The service includes comprehensive error handling:

- `MongoDatasourceException`: MongoDB-specific errors
- `TenantNotFoundException`: Missing tenant errors
- `GlobalExceptionHandler`: Centralized exception handling

## Security

- Basic authentication (configurable)
- Request filtering and validation
- Connection string masking in logs
- Secure password handling

## Building and Running

### Prerequisites
- Java 21
- Maven/Gradle
- MongoDB instance
- Enterprise Manager service running

### Build
```bash
./gradlew build
```

### Run
```bash
./gradlew bootRun
```

### Docker
```bash
docker build -t mongo-database-manager .
docker run -p 8083:8083 mongo-database-manager
```

## Usage Example

```bash
# Create a user for organization-123
curl -X POST http://localhost:8083/api/v1/users \
  -H "org-id: organization-123" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john.doe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "active": true
  }'

# Get all collections for organization-456
curl -X GET http://localhost:8083/api/v1/mongo/collections \
  -H "org-id: organization-456"

# Test connection for specific tenant
curl -X GET http://localhost:8083/api/v1/mongo/test-connection \
  -H "org-id: organization-789"
```

## Monitoring

- **Actuator Endpoints**: `/actuator/health`, `/actuator/metrics`
- **Logging**: Comprehensive logging with tenant context
- **Health Checks**: Built-in MongoDB connection health checks

## Development

### Key Classes

- `MongoDatasourceServiceImpl`: Core service for datasource management
- `MongoTenantContextFilter`: Tenant context extraction
- `MongoDatasourceResolver`: Dynamic datasource resolution
- `MongoTenantTemplateFactory`: Template factory for tenant operations
- `BaseMongoRepository`: Base repository for common operations

### Adding New Entities

1. Create entity class with `@Document` annotation
2. Create service extending `BaseMongoRepository`
3. Create controller with tenant-aware endpoints
4. Add appropriate error handling

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check MongoDB server is running
2. **Tenant Not Found**: Verify Enterprise Manager is returning datasource details
3. **Authentication Failed**: Check MongoDB credentials in Enterprise Manager
4. **Cache Issues**: Clear Redis cache or restart service

### Debug Logging

Enable debug logging:
```yaml
logging:
  level:
    ai.kolate.mongo_database_manager: DEBUG
```

## License

© 2024 AI Kolate. All rights reserved.
