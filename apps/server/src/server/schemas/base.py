from pydantic import BaseModel, ConfigDict


def to_camel(string: str) -> str:
  parts = string.split("_")
  return parts[0] + "".join(word.capitalize() for word in parts[1:])


class ApiSchema(BaseModel):
  model_config = ConfigDict(populate_by_name=True, from_attributes=True)
