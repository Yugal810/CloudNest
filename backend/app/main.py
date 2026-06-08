from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # <--- Add this import
from sqlalchemy import text, inspect
from .database import engine
from . import models, auth
from .routes import users, files, folders, sharing, search

app = FastAPI(title="Distributed File Storage API")

# 1. Define who is allowed to talk to your backend
origins = [
    "http://localhost:5173",  # Your React local dev server
    "http://127.0.0.1:5173",
    "https://distributed-file-storage-1-amo7.onrender.com", # Your production URL
]

# 2. Add the Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows GET, POST, DELETE, etc.
    allow_headers=["*"], # Allows Authorization headers
)

# Create tables and apply lightweight schema patches for existing deployments
models.Base.metadata.create_all(bind=engine)

def _ensure_schema_columns():
    inspector = inspect(engine)
    if "files" not in inspector.get_table_names():
        return

    columns = {col["name"]: col for col in inspector.get_columns("files")}

    with engine.begin() as conn:
        if "mime_type" not in columns:
            conn.execute(text("ALTER TABLE files ADD COLUMN mime_type VARCHAR"))

        size_col = columns.get("size")
        if size_col is not None:
            type_name = size_col["type"].__class__.__name__.upper()
            if type_name in {"INTEGER", "INT", "INT4"}:
                conn.execute(text("ALTER TABLE files ALTER COLUMN size TYPE BIGINT"))

_ensure_schema_columns()

# Register routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(files.router)
app.include_router(folders.router)
app.include_router(sharing.router)
app.include_router(search.router)

@app.get("/")
def root():
    return {"message": "Distributed File Storage API running"}


@app.get("/health")
def health_check():
    """Quick deployment check — DB connectivity and required env vars."""
    import os
    from sqlalchemy import text

    db_ok = False
    db_error = None
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception as exc:
        db_error = str(exc)

    aws_vars = {
        "AWS_ACCESS_KEY_ID": bool(os.getenv("AWS_ACCESS_KEY_ID")),
        "AWS_SECRET_ACCESS_KEY": bool(os.getenv("AWS_SECRET_ACCESS_KEY")),
        "AWS_REGION": bool(os.getenv("AWS_REGION")),
        "AWS_S3_BUCKET_NAME": bool(os.getenv("AWS_S3_BUCKET_NAME")),
    }

    return {
        "status": "ok" if db_ok and all(aws_vars.values()) else "degraded",
        "database": {"connected": db_ok, "error": db_error},
        "aws_env": aws_vars,
    }