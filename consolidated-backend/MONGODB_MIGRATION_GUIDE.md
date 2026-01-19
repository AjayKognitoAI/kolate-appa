# MongoDB Services Migration Guide

## Overview

This guide explains how to migrate from the Spring Boot `mongo-database-manager` microservice to the new FastAPI MongoDB services.

## Architecture Comparison

### Before (Spring Boot)

```
mongo-database-manager/
├── PatientRecordController
├── PatientRecordService
├── PatientRecordRepository
├── ExecutionRecordController
├── ExecutionRecordService
└── MongoTenantTemplateFactory
```

**Technology Stack**:
- Spring Boot 2.x
- Spring Data MongoDB (synchronous)
- MongoTemplate for queries
- Custom multi-tenant template factory

### After (FastAPI)

```
consolidated-backend/
├── app/services/patient_records/
│   ├── patient_record_service.py
│   └── execution_record_service.py
├── app/schemas/mongo/
│   └── __init__.py (Pydantic models)
└── app/routes/
    └── example_patient_records_routes.py
```

**Technology Stack**:
- FastAPI
- Motor (async MongoDB driver)
- Pydantic for validation
- Native async/await support

## API Endpoint Mapping

### Patient Records

| Spring Boot | FastAPI |
|-------------|---------|
| `POST /api/mongo-db/v1/patient-records/{projectId}/{trialSlug}` | `POST /api/v1/projects/{project_id}/trials/{trial_slug}/patient-records` |
| `GET /api/mongo-db/v1/patient-records/{projectId}/{trialSlug}` | `GET /api/v1/projects/{project_id}/trials/{trial_slug}/patient-records` |
| `GET /api/mongo-db/v1/patient-records/{projectId}/{trialSlug}/{recordId}` | `GET /api/v1/projects/{project_id}/trials/{trial_slug}/patient-records/{record_id}` |
| `DELETE /api/mongo-db/v1/patient-records/{projectId}/{trialSlug}/{recordId}` | `DELETE /api/v1/projects/{project_id}/trials/{trial_slug}/patient-records/{record_id}` |

### Execution Records

| Spring Boot | FastAPI |
|-------------|---------|
| `POST /api/mongo-db/v1/executions/{projectId}/{trialSlug}` | `POST /api/v1/projects/{project_id}/trials/{trial_slug}/executions` |
| `GET /api/mongo-db/v1/executions/{projectId}/{trialSlug}/user/{userId}` | `GET /api/v1/projects/{project_id}/trials/{trial_slug}/executions/user/{user_id}` |
| `GET /api/mongo-db/v1/executions/{projectId}/{trialSlug}/{executionId}` | `GET /api/v1/projects/{project_id}/trials/{trial_slug}/executions/{execution_id}` |

## Code Migration Examples

### Example 1: Creating a Patient Record

**Before (Spring Boot)**:
```java
@PostMapping("/patient-records/{projectId}/{trialSlug}")
public PatientRecord createRecord(
    @PathVariable String projectId,
    @PathVariable String trialSlug,
    @RequestBody Map<String, Object> patientData
) {
    return patientRecordService.createRecord(projectId, trialSlug, patientData);
}

// Service
public PatientRecord createRecord(String projectId, String trialSlug, Map<String, Object> patientData) {
    PatientRecord record = PatientRecord.builder()
        .recordId(UUID.randomUUID().toString())
        .patientData(patientData)
        .createdAt(LocalDateTime.now())
        .updatedAt(LocalDateTime.now())
        .build();
    return repository.saveProfile(projectId, trialSlug, record);
}
```

**After (FastAPI)**:
```python
@router.post("/patient-records")
async def create_patient_record(
    project_id: str,
    trial_slug: str,
    record_data: PatientRecordCreate,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
):
    service = PatientRecordService()
    return await service.create_record(org_id, project_id, trial_slug, record_data)

# Service (already implemented)
async def create_record(
    self, org_id: str, project_id: str, trial_slug: str,
    record_data: PatientRecordCreate
) -> PatientRecordResponse:
    collection = await self._get_collection(org_id, project_id, trial_slug)
    doc = {
        "record_id": record_data.record_id or str(uuid.uuid4()),
        "patient_data": record_data.patient_data,
        "metadata": record_data.metadata or {},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await collection.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return PatientRecordResponse(**doc)
```

### Example 2: Getting Paginated Records

**Before (Spring Boot)**:
```java
@GetMapping("/patient-records/{projectId}/{trialSlug}")
public PagedResponse<PatientRecord> getRecords(
    @PathVariable String projectId,
    @PathVariable String trialSlug,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "10") int size
) {
    return patientRecordService.getRecords(projectId, trialSlug, page, size);
}

// Service
public List<PatientRecord> getRecords(String projectId, String trialSlug, int page, int size) {
    return repository.findAllWithPagination(projectId, trialSlug, page, size);
}
```

**After (FastAPI)**:
```python
@router.get("/patient-records")
async def list_patient_records(
    project_id: str,
    trial_slug: str,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
):
    service = PatientRecordService()
    records, total, pages = await service.get_records(
        org_id, project_id, trial_slug, page, size
    )
    return MongoPaginatedResponse(
        items=records, total=total, page=page, size=size, pages=pages
    )
```

### Example 3: Creating an Execution Record

**Before (Spring Boot)**:
```java
@PostMapping("/executions/{projectId}/{trialSlug}")
public ExecutionRecord saveRecord(
    @PathVariable String projectId,
    @PathVariable String trialSlug,
    @RequestBody ExecutionRecord record
) {
    return executionRecordService.saveRecord(projectId, trialSlug, record);
}

// Service
public ExecutionRecord saveRecord(String projectId, String trialSlug, ExecutionRecord record) {
    MongoTemplate mongoTemplate = mongoTenantTemplateFactory.getCurrentTenantTemplate();
    String collectionName = projectId + "_" + trialSlug + "_prediction_results";
    record.setExecutedAt(Instant.now());
    record.setUpdatedAt(Instant.now());
    return mongoTemplate.save(record, collectionName);
}
```

**After (FastAPI)**:
```python
@router.post("/executions")
async def create_execution_record(
    project_id: str,
    trial_slug: str,
    record_data: ExecutionRecordCreate,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
):
    service = ExecutionRecordService()
    return await service.create_record(
        org_id, project_id, trial_slug, record_data, current_user.id
    )
```

## Multi-Tenancy Changes

### Before (Spring Boot)

Used `MongoTenantTemplateFactory` with custom tenant resolution:

```java
@Configuration
public class MongoTenantTemplateFactory {
    public MongoTemplate getCurrentTenantTemplate() {
        String tenantId = TenantContext.getCurrentTenant();
        return mongoTemplates.get(tenantId);
    }
}
```

### After (FastAPI)

Uses database-level isolation with Motor:

```python
async def get_mongo_database(org_id: Optional[str] = None) -> AsyncIOMotorDatabase:
    client = await get_mongo_client()
    tenant_id = org_id or mongo_tenant_var.get()

    if settings.ENABLE_MULTI_TENANT and tenant_id and tenant_id != "default":
        db_name = f"{settings.MONGO_DATABASE}_{tenant_id}"
    else:
        db_name = settings.MONGO_DATABASE

    return client[db_name]
```

## Data Model Changes

### Patient Record

**Before (Java)**:
```java
@Data
@Builder
public class PatientRecord {
    @Id
    private String recordId;
    private Map<String, Object> patientData;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

**After (Python/Pydantic)**:
```python
class PatientRecordResponse(CamelModel):
    id: str = Field(..., alias="_id")
    record_id: Optional[str]
    patient_data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
```

### Execution Record

**Before (Java)**:
```java
@Data
@Document
public class ExecutionRecord {
    @Id
    private String executionId;
    private String userId;
    private Map<String, Object> basePatientData;
    private List<Map<String, Object>> basePrediction;
    private String executedBy;
    private Instant executedAt;
    private String updatedBy;
    private Instant updatedAt;
}
```

**After (Python/Pydantic)**:
```python
class ExecutionRecordResponse(CamelModel):
    id: str = Field(..., alias="_id")
    user_id: str
    base_patient_data: Dict[str, Any]
    base_prediction: List[Dict[str, Any]]
    executed_by: Optional[str]
    executed_at: datetime
    updated_by: Optional[str]
    updated_at: datetime
```

## Frontend Integration Changes

### API Client Update

**Before (Spring Boot client)**:
```typescript
// api/patient-records.ts
export const createPatientRecord = async (
  projectId: string,
  trialSlug: string,
  data: PatientData
) => {
  return axios.post(
    `/api/mongo-db/v1/patient-records/${projectId}/${trialSlug}`,
    data
  );
};
```

**After (FastAPI client)**:
```typescript
// api/patient-records.ts
export const createPatientRecord = async (
  projectId: string,
  trialSlug: string,
  data: PatientRecordCreate
) => {
  return axios.post(
    `/api/v1/projects/${projectId}/trials/${trialSlug}/patient-records`,
    data,
    {
      headers: {
        'org-id': getCurrentOrgId(),
      }
    }
  );
};
```

### Response Handling Changes

**Before**:
```typescript
interface PatientRecord {
  recordId: string;
  patientData: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

**After** (camelCase conversion handled by Pydantic):
```typescript
interface PatientRecordResponse {
  id: string;  // MongoDB _id
  recordId?: string;
  patientData: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

## Testing Migration

### Before (JUnit/Spring Boot Test)

```java
@SpringBootTest
@AutoConfigureMockMvc
class PatientRecordServiceTest {

    @Autowired
    private PatientRecordService service;

    @Test
    void testCreateRecord() {
        Map<String, Object> data = Map.of("age", 45);
        PatientRecord result = service.createRecord("proj1", "trial1", data);
        assertNotNull(result.getRecordId());
    }
}
```

### After (Pytest)

```python
@pytest.mark.asyncio
async def test_create_record(service, mock_collection, sample_record_create):
    with patch.object(service, '_get_collection', return_value=mock_collection):
        mock_result = MagicMock()
        mock_result.inserted_id = ObjectId()
        mock_collection.insert_one.return_value = mock_result

        result = await service.create_record(
            org_id="org_123",
            project_id="project_456",
            trial_slug="trial_789",
            record_data=sample_record_create
        )

        assert result.record_id == "test-record-123"
        assert isinstance(result.created_at, datetime)
```

## Performance Considerations

### Async Operations

**Before**: Synchronous blocking I/O
```java
List<PatientRecord> records = repository.findAll(projectId, trialSlug);
```

**After**: Non-blocking async I/O
```python
records = await service.get_all_records(org_id, project_id, trial_slug)
```

### Connection Pooling

**Before** (Spring Boot):
```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/kolate_db
      min-connections-per-host: 1
      max-connections-per-host: 10
```

**After** (FastAPI):
```python
# settings.py
MONGO_URL = "mongodb://localhost:27017"
MONGO_MIN_POOL_SIZE = 1
MONGO_MAX_POOL_SIZE = 10

# mongodb.py
_mongo_client = AsyncIOMotorClient(
    settings.MONGO_URL,
    minPoolSize=settings.MONGO_MIN_POOL_SIZE,
    maxPoolSize=settings.MONGO_MAX_POOL_SIZE,
)
```

## Error Handling

### Before (Spring Boot)

```java
@ExceptionHandler(ResourceNotFoundException.class)
public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
    return ResponseEntity
        .status(HttpStatus.NOT_FOUND)
        .body(new ErrorResponse(ex.getMessage()));
}
```

### After (FastAPI)

```python
from app.exceptions.base import NotFoundError

@router.get("/{record_id}")
async def get_record(record_id: str):
    try:
        return await service.get_record_by_id(org_id, project_id, trial_slug, record_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
```

## Rollout Strategy

### Phase 1: Parallel Deployment
1. Deploy FastAPI services alongside Spring Boot
2. Route new requests to FastAPI
3. Keep Spring Boot running for existing integrations

### Phase 2: Traffic Migration
1. Update frontend to use new API endpoints
2. Monitor error rates and performance
3. Gradually migrate traffic using feature flags

### Phase 3: Decommission
1. Ensure all clients migrated
2. Remove Spring Boot service
3. Clean up old configurations

## Checklist

- [ ] Deploy FastAPI MongoDB services
- [ ] Set up MongoDB indexes for performance
- [ ] Update frontend API client
- [ ] Update API endpoint URLs
- [ ] Add org-id header to all requests
- [ ] Test authentication/authorization
- [ ] Migrate existing data (if needed)
- [ ] Update monitoring/logging
- [ ] Load test new endpoints
- [ ] Document API changes
- [ ] Train team on new architecture
- [ ] Decommission Spring Boot service

## Troubleshooting

### Common Issues

**Issue**: "Module not found" errors
- **Solution**: Ensure all dependencies in requirements.txt are installed
- Run: `pip install -r requirements.txt`

**Issue**: MongoDB connection failures
- **Solution**: Check MONGO_URL in environment variables
- Verify MongoDB is running and accessible
- Check network firewall rules

**Issue**: "org-id header required"
- **Solution**: Ensure frontend sends org-id header with all requests
- Add to axios defaults: `axios.defaults.headers.common['org-id'] = orgId`

**Issue**: Pagination differences (0-indexed vs 1-indexed)
- **Solution**: FastAPI uses 1-indexed pagination (page=1 is first page)
- Update frontend code: `page = page + 1` if migrating from 0-indexed

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Motor Documentation](https://motor.readthedocs.io/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- Project README: `/home/user/kolate-appa/consolidated-backend/app/services/patient_records/README.md`
- Example Routes: `/home/user/kolate-appa/consolidated-backend/app/routes/example_patient_records_routes.py`
