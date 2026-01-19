# Phase 0.1: Explore Backend Template

## Objective
Build comprehensive understanding of the FastAPI backend template that will be the target for migration.

---

## Prompt

```
I need you to thoroughly explore and understand the backend template in `backend-template-to-use/` folder. This template will be the foundation for our consolidated backend.

## What to Explore

### 1. Project Structure
Read and understand the folder organization:
- `app/` - Main application code
- `app/config/` - Configuration management
- `app/core/` - Core utilities (auth, database, cache)
- `app/models/` - SQLAlchemy models
- `app/schemas/` - Pydantic schemas
- `app/services/` - Business logic layer
- `app/routes/` - API endpoints
- `app/middleware/` - Request/response middleware
- `app/exceptions/` - Custom exceptions

### 2. Key Files to Read
Please read these files to understand the patterns:

**Configuration:**
- `app/config/settings.py` - How configuration is managed

**Authentication & Authorization:**
- `app/core/auth0.py` - Auth0 JWT verification
- `app/core/permissions.py` - Permission checking system

**Database:**
- `app/core/database.py` - Async SQLAlchemy setup
- `app/models/base.py` - Base model with timestamps

**Generic Patterns:**
- `app/services/crud_service.py` - Generic CRUD service
- `app/routes/crud_router.py` - Generic CRUD router factory

**Example Implementations:**
- `app/models/feature.py` - Example model
- `app/services/feature_service.py` - Example service
- `app/routes/features.py` - Example routes
- `app/schemas/feature.py` - Example schemas

**Documentation:**
- `ARCHITECTURE.md` - Architecture overview
- `TEMPLATE_USAGE.md` - How to use the template
- `AUTH0_SETUP.md` - Auth0 configuration guide

### 3. Questions to Answer

After exploration, provide a summary answering:

1. **How is authentication handled?**
   - How does JWT validation work?
   - How are permissions checked?
   - What is the Auth0User object structure?

2. **How is the database layer organized?**
   - What is the BaseModel structure?
   - How are relationships defined?
   - How is async database access done?

3. **How does the generic CRUD pattern work?**
   - How does CRUDService work?
   - How does CRUDRouter generate endpoints?
   - How to add custom endpoints?

4. **How to add a new entity?**
   - What files need to be created?
   - What is the step-by-step process?

5. **How is configuration managed?**
   - Environment variables
   - Pydantic settings
   - Required vs optional settings

6. **What existing entities are in the template?**
   - List all models
   - List all routes
   - What's already implemented?

### 4. Create Summary

After exploration, create a concise summary document that captures:
- Key patterns and conventions
- File locations for common tasks
- Code snippets for reference
- Any gaps or things that need to be added for migration

## Expected Output

Provide a structured report with:
1. Architecture overview
2. Authentication flow diagram (text-based)
3. Database patterns summary
4. CRUD pattern explanation
5. Step-by-step guide for adding new entities
6. List of existing implementations
7. Recommendations for migration
```

---

## Why This Matters

Understanding the template deeply before migration ensures:
- Consistent code patterns across the consolidated backend
- Proper use of existing utilities (don't reinvent the wheel)
- Awareness of built-in features (caching, permissions, etc.)

## Next Step
After completing this prompt, proceed to [02-explore-existing-architecture.md](02-explore-existing-architecture.md)
