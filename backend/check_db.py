from app.database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
columns = [c['name'] for c in inspector.get_columns('reviews')]
print(f"Columns in 'reviews': {columns}")
