"""Generic CRUD base class for database operations."""

from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.db.base import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    CRUD object with default methods to Create, Read, Update, Delete (CRUD).
    
    **Parameters**
    * `model`: A SQLAlchemy model class
    * `schema`: A Pydantic model (schema) class
    """
    
    def __init__(self, model: Type[ModelType]):
        """
        Initialize CRUD object.
        
        Args:
            model: A SQLAlchemy model class
        """
        self.model = model

    def get(self, db: Session, id: Any) -> Optional[ModelType]:
        """
        Get a single record by id.
        
        Args:
            db: Database session
            id: Record ID
            
        Returns:
            Model instance or None if not found
        """
        return db.query(self.model).filter(self.model.id == id).first()

    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 1000
    ) -> List[ModelType]:
        """
        Get multiple records with pagination.
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of model instances
        """
        return db.query(self.model).offset(skip).limit(limit).all()

    def create(self, db: Session, *, obj_in: CreateSchemaType) -> ModelType:
        """
        Create a new record.
        
        Args:
            db: Database session
            obj_in: Pydantic schema with data to create
            
        Returns:
            Created model instance
        """
        obj_in_data = jsonable_encoder(obj_in)
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj    
    
    def update(
        self,
        db: Session,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        """
        Update a record.
        
        Args:
            db: Database session
            db_obj: Existing model instance to update
            obj_in: Pydantic schema or dict with update data
            
        Returns:
            Updated model instance
        """
        obj_data = jsonable_encoder(db_obj)
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
        
    def upsert(
        self, 
        db: Session, 
        *, 
        obj_in: Union[CreateSchemaType, Dict[str, Any]],
        filter_by: Dict[str, Any]
    ) -> ModelType:
        """
        Create or update a record based on a filter.
        
        Args:
            db: Database session
            obj_in: Data to create or update the record with
            filter_by: Dictionary of field-value pairs to find existing record
            
        Returns:
            The created or updated record
        """
        # Check if record exists
        query = db.query(self.model)
        for field, value in filter_by.items():
            query = query.filter(getattr(self.model, field) == value)
        
        db_obj = query.first()
        
        # If record exists, update it
        if db_obj:
            if isinstance(obj_in, dict):
                update_data = obj_in
            else:
                update_data = obj_in.model_dump(exclude_unset=True)

            # Update only the fields that are in the update_data
            for field in update_data:
                if hasattr(db_obj, field):
                    setattr(db_obj, field, update_data[field])  
        else:
            obj_in_data = jsonable_encoder(obj_in) if not isinstance(obj_in, dict) else obj_in
            db_obj = self.model(**obj_in_data)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: int) -> ModelType:
        """
        Delete a record.
        
        Args:
            db: Database session
            id: Record ID to delete
            
        Returns:
            Deleted model instance
        """
        obj = db.query(self.model).get(id)
        db.delete(obj)
        db.commit()
        return obj

    def get_by_field(
        self, db: Session, *, field_name: str, value: Any
    ) -> Optional[ModelType]:
        """
        Get a record by a specific field value.
        
        Args:
            db: Database session
            field_name: Name of the field to filter by
            value: Value to match
            
        Returns:
            Model instance or None if not found
        """
        return db.query(self.model).filter(
            getattr(self.model, field_name) == value
        ).first()

    def get_multi_by_field(
        self, db: Session, *, field_name: str, value: Any, skip: int = 0, limit: int = 1000
    ) -> List[ModelType]:
        """
        Get multiple records by a specific field value with pagination.
        
        Args:
            db: Database session
            field_name: Name of the field to filter by
            value: Value to match
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of model instances
        """
        return db.query(self.model).filter(
            getattr(self.model, field_name) == value
        ).offset(skip).limit(limit).all()

    def exists(self, db: Session, *, id: int) -> bool:
        """
        Check if a record exists by id.
        
        Args:
            db: Database session
            id: Record ID to check
            
        Returns:
            True if record exists, False otherwise
        """
        return db.query(self.model).filter(self.model.id == id).first() is not None

    def count(self, db: Session) -> int:
        """
        Get total count of records.
        
        Args:
            db: Database session
            
        Returns:
            Total number of records
        """
        return db.query(self.model).count()
