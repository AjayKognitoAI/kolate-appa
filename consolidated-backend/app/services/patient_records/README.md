# Patient Records MongoDB Services

This package provides MongoDB-based services for managing patient records and execution records in the Kolate application.

## Overview

The services provide async CRUD operations for:
- **Patient Records**: Clinical trial patient data storage
- **Execution Records**: Model execution/prediction tracking

Both services support:
- Multi-tenant isolation (org-based)
- Project/trial-specific collections
- Pagination and sorting
- Flexible search and filtering
- Bulk operations

## Architecture

### Collection Naming

Collections are created dynamically per project/trial:

```python
# Patient Records
collection_name = f"{project_id}_{trial_slug}_patient_records"

# Execution Records
collection_name = f"{project_id}_{trial_slug}_prediction_results"
```

### Multi-Tenancy

Data is isolated by organization:

```python
database_name = f"{MONGO_DATABASE}_{org_id}"
```

## Services

### PatientRecordService

Manages patient clinical data records.

#### Methods

**create_record(org_id, project_id, trial_slug, record_data)**
```python
from app.services.patient_records import PatientRecordService
from app.schemas.mongo import PatientRecordCreate

service = PatientRecordService()

record_data = PatientRecordCreate(
    record_id="patient_001",  # Optional, auto-generated if not provided
    patient_data={
        "age": 45,
        "gender": "M",
        "blood_pressure": 120,
        "cholesterol": 200
    },
    metadata={"source": "hospital_system"}
)

record = await service.create_record(
    org_id="org_abc123",
    project_id="project_456",
    trial_slug="trial_789",
    record_data=record_data
)
```

**get_records(org_id, project_id, trial_slug, page, size, sort_by, sort_order)**
```python
records, total, pages = await service.get_records(
    org_id="org_abc123",
    project_id="project_456",
    trial_slug="trial_789",
    page=1,
    size=20,
    sort_by="created_at",
    sort_order="desc"
)
```

**get_all_records(org_id, project_id, trial_slug)**
```python
# Warning: Use with caution for large datasets
all_records = await service.get_all_records(
    org_id="org_abc123",
    project_id="project_456",
    trial_slug="trial_789"
)
```

**get_record_by_id(org_id, project_id, trial_slug, record_id)**
```python
from app.exceptions.base import NotFoundError

try:
    record = await service.get_record_by_id(
        org_id="org_abc123",
        project_id="project_456",
        trial_slug="trial_789",
        record_id="patient_001"
    )
except NotFoundError:
    # Handle not found
    pass
```

**update_record(org_id, project_id, trial_slug, record_id, update_data)**
```python
from app.schemas.mongo import PatientRecordUpdate

update_data = PatientRecordUpdate(
    patient_data={"age": 46, "blood_pressure": 125},
    metadata={"updated": True}
)

updated_record = await service.update_record(
    org_id="org_abc123",
    project_id="project_456",
    trial_slug="trial_789",
    record_id="patient_001",
    update_data=update_data
)
```

**delete_record(org_id, project_id, trial_slug, record_id)**
```python
await service.delete_record(
    org_id="org_abc123",
    project_id="project_456",
    trial_slug="trial_789",
    record_id="patient_001"
)
```

**bulk_create_records(org_id, project_id, trial_slug, records)**
```python
records = [
    PatientRecordCreate(patient_data={"age": 30}, metadata={}),
    PatientRecordCreate(patient_data={"age": 40}, metadata={}),
    PatientRecordCreate(patient_data={"age": 50}, metadata={}),
]

created_records = await service.bulk_create_records(
    org_id="org_abc123",
    project_id="project_456",
    trial_slug="trial_789",
    records=records
)
```

**search_records(org_id, project_id, trial_slug, search_params, page, size)**
```python
from app.schemas.mongo import PatientRecordSearch

# Search by record_id
search_params = PatientRecordSearch(record_id="patient_001")

# Or search with flexible field filters
search_params = PatientRecordSearch(
    filters={
        "patient_data.age": {"$gte": 40, "$lte": 60},
        "patient_data.gender": "M"
    }
)

records, total, pages = await service.search_records(
    org_id="org_abc123",
    project_id="project_456",
    trial_slug="trial_789",
    search_params=search_params,
    page=1,
    size=20
)
```

**count_records(org_id, project_id, trial_slug)**
```python
total = await service.count_records(
    org_id="org_abc123",
    project_id="project_456",
    trial_slug="trial_789"
)
```

### ExecutionRecordService

Manages model execution and prediction records.

#### Methods

**create_record(org_id, project_id, trial_slug, record_data, current_user)**
```python
from app.services.patient_records import ExecutionRecordService
from app.schemas.mongo import ExecutionRecordCreate

service = ExecutionRecordService()

record_data = ExecutionRecordCreate(
    user_id="auth0|user123",
    base_patient_data={"age": 45, "gender": "M"},
    base_prediction=[
        {"model": "model_a", "prediction": 0.85, "confidence": 0.92},
        {"model": "model_b", "prediction": 0.72, "confidence": 0.88}
    ],
    executed_by="auth0|admin123"  # Optional, uses current_user if not provided
)

record = await service.create_record(
    org_id="org_abc123",
    project_id="project_456",
    trial_slug="trial_789",
    record_data=record_data,
    current_user="auth0|admin123"
)
```

**get_records(org_id, project_id, trial_slug, page, size, sort_by, sort_order)**
```python
records, total, pages = await service.get_records(
    org_id="org_abc123",
    project_id="project_456",
    trial_slug="trial_789",
    page=1,
    size=20,
    sort_by="executed_at",
    sort_order="desc"
)
```

**get_record_by_id(org_id, project_id, trial_slug, execution_id)**
```python
record = await service.get_record_by_id(
    org_id="org_abc123",
    project_id="project_456",
    trial_slug="trial_789",
    execution_id="exec_uuid_123"
)
```

**update_record(org_id, project_id, trial_slug, execution_id, update_data, current_user)**
```python
from app.schemas.mongo import ExecutionRecordUpdate

update_data = ExecutionRecordUpdate(
    base_prediction=[{"model": "model_c", "prediction": 0.90}],
    updated_by="auth0|updater123"
)

updated_record = await service.update_record(
    org_id="org_abc123",
    project_id="project_456",
    trial_slug="trial_789",
    execution_id="exec_uuid_123",
    update_data=update_data,
    current_user="auth0|updater123"
)
```

**get_records_by_ids(org_id, project_id, trial_slug, execution_ids)**
```python
execution_ids = ["exec_1", "exec_2", "exec_3"]

records = await service.get_records_by_ids(
    org_id="org_abc123",
    project_id="project_456",
    trial_slug="trial_789",
    execution_ids=execution_ids
)
```

**search_records(org_id, project_id, trial_slug, search_params, page, size)**
```python
from app.schemas.mongo import ExecutionRecordSearch
from datetime import datetime, timedelta

# Search by user
search_params = ExecutionRecordSearch(user_id="auth0|user123")

# Search by date range
search_params = ExecutionRecordSearch(
    date_from=datetime.utcnow() - timedelta(days=7),
    date_to=datetime.utcnow()
)

# Search by executor
search_params = ExecutionRecordSearch(executed_by="auth0|admin123")

records, total, pages = await service.search_records(
    org_id="org_abc123",
    project_id="project_456",
    trial_slug="trial_789",
    search_params=search_params,
    page=1,
    size=20
)
```

**get_user_records(org_id, project_id, trial_slug, user_id, page, size)**
```python
records, total, pages = await service.get_user_records(
    org_id="org_abc123",
    project_id="project_456",
    trial_slug="trial_789",
    user_id="auth0|user123",
    page=1,
    size=20
)
```

**count_records(org_id, project_id, trial_slug, user_id)**
```python
# Count all records
total = await service.count_records(
    org_id="org_abc123",
    project_id="project_456",
    trial_slug="trial_789"
)

# Count records for specific user
total = await service.count_records(
    org_id="org_abc123",
    project_id="project_456",
    trial_slug="trial_789",
    user_id="auth0|user123"
)
```

**delete_record(org_id, project_id, trial_slug, execution_id)**
```python
await service.delete_record(
    org_id="org_abc123",
    project_id="project_456",
    trial_slug="trial_789",
    execution_id="exec_uuid_123"
)
```

## FastAPI Route Integration

Example route using these services:

```python
from fastapi import APIRouter, Depends, Query
from app.services.patient_records import PatientRecordService, ExecutionRecordService
from app.schemas.mongo import (
    PatientRecordCreate,
    PatientRecordResponse,
    ExecutionRecordCreate,
    ExecutionRecordResponse,
    MongoPaginatedResponse,
)
from app.core.permissions import get_current_user, Auth0User

router = APIRouter(prefix="/api/v1/projects/{project_id}/trials/{trial_slug}")

@router.post("/patient-records", response_model=PatientRecordResponse)
async def create_patient_record(
    project_id: str,
    trial_slug: str,
    record_data: PatientRecordCreate,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
):
    """Create a new patient record."""
    service = PatientRecordService()
    return await service.create_record(org_id, project_id, trial_slug, record_data)

@router.get("/patient-records", response_model=MongoPaginatedResponse)
async def get_patient_records(
    project_id: str,
    trial_slug: str,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
):
    """Get paginated patient records."""
    service = PatientRecordService()
    records, total, pages = await service.get_records(
        org_id, project_id, trial_slug, page, size
    )
    return MongoPaginatedResponse(
        items=records,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.post("/executions", response_model=ExecutionRecordResponse)
async def create_execution(
    project_id: str,
    trial_slug: str,
    record_data: ExecutionRecordCreate,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
):
    """Create a new execution record."""
    service = ExecutionRecordService()
    return await service.create_record(
        org_id, project_id, trial_slug, record_data, current_user.id
    )
```

## Error Handling

Both services raise standard application exceptions:

```python
from app.exceptions.base import NotFoundError, ValidationError

try:
    record = await service.get_record_by_id(org_id, project_id, trial_slug, "non-existent")
except NotFoundError as e:
    # Handle not found (404)
    print(f"Error: {e.message}")
    print(f"Details: {e.details}")

try:
    await service.bulk_create_records(org_id, project_id, trial_slug, [])
except ValidationError as e:
    # Handle validation error (422)
    print(f"Error: {e.message}")
    print(f"Field: {e.field}")
```

## Testing

Comprehensive test suites are available:

```bash
# Run all tests
pytest tests/services/test_patient_record_service.py -v
pytest tests/services/test_execution_record_service.py -v

# Run with coverage
pytest tests/services/test_patient_record_service.py --cov=app.services.patient_records
```

## Performance Considerations

1. **Pagination**: Always use pagination for large datasets
2. **Indexes**: Create indexes on frequently queried fields:
   ```python
   # In MongoDB
   db[collection_name].create_index([("record_id", 1)])
   db[collection_name].create_index([("created_at", -1)])
   db[collection_name].create_index([("user_id", 1), ("executed_at", -1)])
   ```
3. **Bulk Operations**: Use `bulk_create_records` for multiple inserts
4. **Connection Pooling**: Configured via `MONGO_MIN_POOL_SIZE` and `MONGO_MAX_POOL_SIZE`

## Migration from Spring Boot

These services replace the following Spring Boot microservices:
- `mongo-database-manager` → `PatientRecordService`, `ExecutionRecordService`

Key differences:
- Async operations using Motor instead of synchronous MongoTemplate
- Pydantic schemas instead of Java DTOs
- Native FastAPI integration
- Simplified multi-tenancy with database-level isolation
