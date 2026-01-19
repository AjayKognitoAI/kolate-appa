from pydantic import BaseModel

def to_camel(string: str) -> str:
    return ''.join(word.capitalize() if i else word for i, word in enumerate(string.split('_')))


class CamelModel(BaseModel):
    model_config = {
        "alias_generator": to_camel,
        "populate_by_name": True,
        "from_attributes": True  # replaces orm_mode in Pydantic v2
    }
