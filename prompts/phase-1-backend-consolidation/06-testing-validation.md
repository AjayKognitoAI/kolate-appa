# Phase 1.6: Testing & Validation

## Objective
Test the consolidated backend to ensure all endpoints work correctly, security is maintained, and performance meets requirements.

---

## Prompt

```
Using the test-engineer and security-auditor agents, create comprehensive tests for the consolidated backend and validate security.

## Tasks

### 1. Unit Tests for Services

Create tests in `consolidated-backend/tests/services/`

#### Test Structure
```
tests/
├── conftest.py                    # Shared fixtures
├── services/
│   ├── test_enterprise_service.py
│   ├── test_project_service.py
│   ├── test_user_service.py
│   ├── test_auth0_services.py
│   ├── test_storage_service.py
│   └── test_mongo_services.py
├── routes/
│   ├── test_enterprise_routes.py
│   ├── test_project_routes.py
│   ├── test_user_routes.py
│   └── test_auth_routes.py
├── integration/
│   ├── test_full_workflow.py
│   └── test_multi_tenancy.py
└── security/
    ├── test_auth_middleware.py
    ├── test_permissions.py
    └── test_input_validation.py
```

#### Example Service Test
```python
# tests/services/test_enterprise_service.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.enterprises.enterprise_service import EnterpriseService
from app.schemas.enterprise import EnterpriseCreate, EnterpriseUpdate

@pytest.fixture
def enterprise_service():
    return EnterpriseService()

@pytest.fixture
def mock_db():
    return AsyncMock()

class TestEnterpriseService:

    @pytest.mark.asyncio
    async def test_create_enterprise(self, enterprise_service, mock_db):
        # Arrange
        data = EnterpriseCreate(
            organization_id="org_123",
            name="Test Enterprise",
            admin_email="admin@test.com"
        )

        # Act
        result = await enterprise_service.create(mock_db, data)

        # Assert
        assert result is not None
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_by_organization_id(self, enterprise_service, mock_db):
        # Arrange
        org_id = "org_123"
        mock_db.execute.return_value.scalar_one_or_none.return_value = MagicMock(
            id="ent_1",
            organization_id=org_id
        )

        # Act
        result = await enterprise_service.get_by_organization_id(mock_db, org_id)

        # Assert
        assert result.organization_id == org_id

    @pytest.mark.asyncio
    async def test_check_domain_exists_true(self, enterprise_service, mock_db):
        mock_db.execute.return_value.scalar_one_or_none.return_value = "existing_id"

        result = await enterprise_service.check_domain_exists(mock_db, "example.com")

        assert result is True

    @pytest.mark.asyncio
    async def test_check_domain_exists_false(self, enterprise_service, mock_db):
        mock_db.execute.return_value.scalar_one_or_none.return_value = None

        result = await enterprise_service.check_domain_exists(mock_db, "new-domain.com")

        assert result is False

    @pytest.mark.asyncio
    async def test_soft_delete(self, enterprise_service, mock_db):
        # Arrange
        enterprise = MagicMock(status="ACTIVE")
        mock_db.execute.return_value.scalar_one_or_none.return_value = enterprise

        # Act
        result = await enterprise_service.soft_delete(mock_db, "ent_1")

        # Assert
        assert result is True
        assert enterprise.status == "DELETED"
```

### 2. Route/API Tests

```python
# tests/routes/test_enterprise_routes.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
def auth_headers():
    # Mock Auth0 token
    return {"Authorization": "Bearer test_token", "org-id": "org_123"}

class TestEnterpriseRoutes:

    @pytest.mark.asyncio
    async def test_create_enterprise(self, client, auth_headers):
        response = await client.post(
            "/api/v1/enterprises",
            json={
                "organizationId": "org_new",
                "name": "New Enterprise",
                "adminEmail": "admin@new.com"
            },
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["data"]["name"] == "New Enterprise"

    @pytest.mark.asyncio
    async def test_get_enterprise_by_id(self, client, auth_headers):
        response = await client.get(
            "/api/v1/enterprises/ent_123",
            headers=auth_headers
        )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_enterprise_unauthorized(self, client):
        response = await client.get("/api/v1/enterprises/ent_123")

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_enterprises_pagination(self, client, auth_headers):
        response = await client.get(
            "/api/v1/enterprises?page=1&size=10",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data["data"]
        assert "total" in data["data"]
        assert "page" in data["data"]
```

### 3. Integration Tests

```python
# tests/integration/test_full_workflow.py
import pytest
from httpx import AsyncClient

class TestEnterpriseWorkflow:
    """Test complete enterprise lifecycle"""

    @pytest.mark.asyncio
    async def test_enterprise_onboarding_workflow(self, client, auth_headers):
        # 1. Create enterprise
        create_resp = await client.post(
            "/api/v1/enterprises",
            json={"organizationId": "org_test", "name": "Test", "adminEmail": "a@t.com"},
            headers=auth_headers
        )
        enterprise_id = create_resp.json()["data"]["id"]

        # 2. Add admin
        await client.post(
            f"/api/v1/enterprises/{enterprise_id}/admins",
            json={"auth0UserId": "auth0|123", "email": "admin@t.com"},
            headers=auth_headers
        )

        # 3. Create datasource
        await client.post(
            f"/api/v1/enterprises/{enterprise_id}/datasources",
            json={"datasourceName": "main_db", "datasourceType": "postgresql"},
            headers=auth_headers
        )

        # 4. Update onboarding progress
        await client.put(
            f"/api/v1/enterprises/{enterprise_id}/onboarding",
            json={"currentStep": "DATASOURCE_CONFIGURED"},
            headers=auth_headers
        )

        # 5. Complete onboarding
        complete_resp = await client.post(
            f"/api/v1/enterprises/{enterprise_id}/onboarding/complete",
            headers=auth_headers
        )

        assert complete_resp.status_code == 200

class TestMultiTenancy:
    """Test multi-tenant isolation"""

    @pytest.mark.asyncio
    async def test_tenant_data_isolation(self, client):
        # Create data for org_1
        org1_headers = {"Authorization": "Bearer token1", "org-id": "org_1"}
        await client.post(
            "/api/v1/projects",
            json={"name": "Org1 Project"},
            headers=org1_headers
        )

        # Create data for org_2
        org2_headers = {"Authorization": "Bearer token2", "org-id": "org_2"}
        await client.post(
            "/api/v1/projects",
            json={"name": "Org2 Project"},
            headers=org2_headers
        )

        # Verify org_1 can only see their data
        resp1 = await client.get("/api/v1/projects", headers=org1_headers)
        projects1 = resp1.json()["data"]["items"]
        assert all(p["organizationId"] == "org_1" for p in projects1)

        # Verify org_2 can only see their data
        resp2 = await client.get("/api/v1/projects", headers=org2_headers)
        projects2 = resp2.json()["data"]["items"]
        assert all(p["organizationId"] == "org_2" for p in projects2)
```

### 4. Security Tests

```python
# tests/security/test_auth_middleware.py
import pytest
from httpx import AsyncClient

class TestAuthMiddleware:

    @pytest.mark.asyncio
    async def test_missing_token_rejected(self, client):
        response = await client.get("/api/v1/enterprises")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_token_rejected(self, client):
        response = await client.get(
            "/api/v1/enterprises",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_expired_token_rejected(self, client):
        # Token with exp in the past
        expired_token = "eyJ..."
        response = await client.get(
            "/api/v1/enterprises",
            headers={"Authorization": f"Bearer {expired_token}"}
        )
        assert response.status_code == 401

class TestPermissions:

    @pytest.mark.asyncio
    async def test_insufficient_permissions_rejected(self, client, viewer_auth_headers):
        # Viewer trying to create enterprise
        response = await client.post(
            "/api/v1/enterprises",
            json={"name": "Test"},
            headers=viewer_auth_headers
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_can_create(self, client, admin_auth_headers):
        response = await client.post(
            "/api/v1/enterprises",
            json={"organizationId": "org", "name": "Test", "adminEmail": "a@t.com"},
            headers=admin_auth_headers
        )
        assert response.status_code == 201

class TestInputValidation:

    @pytest.mark.asyncio
    async def test_sql_injection_prevented(self, client, auth_headers):
        response = await client.get(
            "/api/v1/enterprises/search",
            params={"query": "'; DROP TABLE enterprises; --"},
            headers=auth_headers
        )
        # Should not crash, should return empty or error
        assert response.status_code in [200, 400]

    @pytest.mark.asyncio
    async def test_xss_prevented(self, client, auth_headers):
        response = await client.post(
            "/api/v1/enterprises",
            json={
                "organizationId": "org",
                "name": "<script>alert('xss')</script>",
                "adminEmail": "a@t.com"
            },
            headers=auth_headers
        )
        # Should sanitize or reject
        if response.status_code == 201:
            data = response.json()
            assert "<script>" not in data["data"]["name"]
```

### 5. Performance Tests

```python
# tests/performance/test_load.py
import pytest
import asyncio
from httpx import AsyncClient

class TestPerformance:

    @pytest.mark.asyncio
    async def test_concurrent_requests(self, client, auth_headers):
        """Test handling 100 concurrent requests"""
        async def make_request():
            return await client.get("/api/v1/enterprises", headers=auth_headers)

        tasks = [make_request() for _ in range(100)]
        responses = await asyncio.gather(*tasks)

        success_count = sum(1 for r in responses if r.status_code == 200)
        assert success_count >= 95  # 95% success rate

    @pytest.mark.asyncio
    async def test_response_time(self, client, auth_headers):
        """Test response time under 500ms"""
        import time

        start = time.time()
        response = await client.get("/api/v1/enterprises", headers=auth_headers)
        elapsed = time.time() - start

        assert response.status_code == 200
        assert elapsed < 0.5  # 500ms
```

### 6. API Compatibility Tests

```python
# tests/compatibility/test_api_parity.py
"""
Tests to ensure API responses match the original microservices format
"""

class TestResponseFormat:

    @pytest.mark.asyncio
    async def test_global_response_wrapper(self, client, auth_headers):
        response = await client.get("/api/v1/enterprises/ent_1", headers=auth_headers)
        data = response.json()

        # Verify GlobalResponse format
        assert "state" in data
        assert "status" in data
        assert "message" in data
        assert "data" in data

    @pytest.mark.asyncio
    async def test_pagination_format(self, client, auth_headers):
        response = await client.get("/api/v1/enterprises", headers=auth_headers)
        data = response.json()["data"]

        # Verify pagination format
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "size" in data
        assert "pages" in data or "totalPages" in data

    @pytest.mark.asyncio
    async def test_camel_case_response(self, client, auth_headers):
        response = await client.get("/api/v1/enterprises/ent_1", headers=auth_headers)
        data = response.json()["data"]

        # Verify camelCase (not snake_case)
        assert "organizationId" in data or "organization_id" not in data
        assert "adminEmail" in data or "admin_email" not in data
```

---

## Security Audit Checklist

Using the security-auditor agent, verify:

### Authentication & Authorization
- [ ] All endpoints require authentication (except public routes)
- [ ] JWT tokens are properly validated against Auth0 JWKS
- [ ] Token expiration is enforced
- [ ] Permission checks on all protected endpoints
- [ ] Org-id header is validated against user's organizations

### Input Validation
- [ ] All inputs validated with Pydantic schemas
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (output encoding)
- [ ] File upload restrictions (type, size)
- [ ] Rate limiting implemented

### Data Security
- [ ] Connection strings encrypted at rest
- [ ] Sensitive data not logged
- [ ] Multi-tenant data isolation verified
- [ ] Proper error messages (no stack traces in production)

### Infrastructure
- [ ] CORS properly configured
- [ ] HTTPS enforced (in production)
- [ ] Security headers present (X-Content-Type-Options, etc.)
- [ ] Dependencies checked for vulnerabilities

---

## Run Tests

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html

# Run specific test file
pytest tests/services/test_enterprise_service.py -v

# Run security tests only
pytest tests/security/ -v

# Run with async support
pytest tests/ -v --asyncio-mode=auto
```

---

## Deliverables
1. Complete test suite with >80% coverage
2. All security audit items verified
3. Performance benchmarks documented
4. API compatibility tests passing
5. CI/CD pipeline configuration for tests

All tests must pass before moving to Phase 2.
```

---

## Next Step
After completing Phase 1, proceed to [Phase 2: Frontend Migration](../phase-2-frontend-migration/01-api-client-update.md)
