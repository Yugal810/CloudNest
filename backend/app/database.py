import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. Look for 'DATABASE_URL' in Render's settings. 
# 2. If it's not found (like on your PC), use your local address as the fallback.
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:yugal@localhost/filestorage_db"
)

# Fix for Render/Heroku: SQLAlchemy requires 'postgresql://', 
# but some providers give 'postgres://'.
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()