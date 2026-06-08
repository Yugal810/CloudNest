from dotenv import load_dotenv
import os
import boto3
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from starlette.background import BackgroundTasks

from ..database import get_db
from .. import models
from ..auth import get_current_user

load_dotenv()

router = APIRouter(tags=["Files"])

# AWS S3 Configuration
s3 = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION")
)

S3_BUCKET = os.getenv("AWS_S3_BUCKET_NAME")


def _require_s3_config():
    missing = [
        name for name, value in [
            ("AWS_ACCESS_KEY_ID", os.getenv("AWS_ACCESS_KEY_ID")),
            ("AWS_SECRET_ACCESS_KEY", os.getenv("AWS_SECRET_ACCESS_KEY")),
            ("AWS_S3_BUCKET_NAME", S3_BUCKET),
        ]
        if not value
    ]
    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"AWS S3 is not configured. Set: {', '.join(missing)}",
        )


# --- Request Schemas ---
class FileInitRequest(BaseModel):
    filename: str
    size: int
    mime_type: str  # e.g., "image/png", "application/pdf" -> For rendering thumbnails
    folder_id: Optional[int] = None

class ChunkUrlRequest(BaseModel):
    file_id: int
    chunk_index: int


# --- HELPER: Unified S3 Key Generator ---
def get_s3_key(node: str, file_id: int, chunk_index: int):
    return f"{node}/file_{file_id}_chunk_{chunk_index}"


# --- HELPER: Dynamic Node Allocator ---
def get_allocated_nodes(file_size_bytes: int):
    """Dynamically determines the cluster storage node footprint based on file size."""
    if file_size_bytes < 50 * 1024 * 1024:         # Under 50 MB
        return ["node1", "node2"]
    elif file_size_bytes < 500 * 1024 * 1024:     # 50 MB to 500 MB
        return ["node1", "node2", "node3", "node4"]
    else:                                         # Gigabyte Scale (Heavy Payloads)
        # Dynamically scale cluster layout up to 10 nodes for parallel data distribution
        return [f"node_cluster_{i}" for i in range(1, 11)]


# --- 1. INITIALIZE FILE UPLOAD (Step 1) ---
@router.post("/upload/init")
def initialize_upload(
    request: FileInitRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    existing = db.query(models.File).filter(
        models.File.owner_id == current_user.id,
        models.File.folder_id == request.folder_id,
        models.File.filename == request.filename
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="File already exists in this folder")

    # Save metadata including size and mime_type for frontend grid thumbnails
    db_file = models.File(
        filename=request.filename,
        owner_id=current_user.id,
        folder_id=request.folder_id,
        size=request.size,
        mime_type=request.mime_type
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    # Calculate chunk configuration metrics
    chunk_size = 1024 * 1024  # 1MB Shards
    total_chunks = (request.size + chunk_size - 1) // chunk_size
    allocated_nodes = get_allocated_nodes(request.size)

    return {
        "message": "Dynamic storage cluster matrix allocated",
        "file_id": db_file.id,
        "nodes_allocated": allocated_nodes,
        "total_expected_shards": total_chunks
    }


# --- 2. GENERATE SHARD PRESIGNED URL (Step 2) ---
@router.post("/upload/chunk-url")
def generate_chunk_url(
    request: ChunkUrlRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_file = db.query(models.File).filter(
        models.File.id == request.file_id, 
        models.File.owner_id == current_user.id
    ).first()
    
    if not db_file:
        raise HTTPException(status_code=404, detail="File context registration not found")

    _require_s3_config()

    # Re-evaluate dynamic nodes matching the record's size layout
    active_nodes = get_allocated_nodes(db_file.size)
    node = active_nodes[request.chunk_index % len(active_nodes)]
    s3_key = get_s3_key(node, db_file.id, request.chunk_index)

    try:
        # Request short-lived chunk write permission directly to S3 edge
        presigned_url = s3.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': S3_BUCKET,
                'Key': s3_key
            },
            ExpiresIn=600
        )

        # Log chunk referencing directly to the DB table record
        db_chunk = models.FileChunk(
            file_id=db_file.id, 
            chunk_index=request.chunk_index, 
            node=node
        )
        db.add(db_chunk)
        db.commit()

        return {"upload_url": presigned_url, "node": node}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- 2b. UPLOAD SHARD VIA BACKEND (avoids browser S3 CORS issues) ---
@router.post("/upload/chunk")
async def upload_chunk(
    file_id: int = Form(...),
    chunk_index: int = Form(...),
    chunk: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_file = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.owner_id == current_user.id,
    ).first()

    if not db_file:
        raise HTTPException(status_code=404, detail="File context registration not found")

    _require_s3_config()

    active_nodes = get_allocated_nodes(db_file.size)
    node = active_nodes[chunk_index % len(active_nodes)]
    s3_key = get_s3_key(node, db_file.id, chunk_index)

    try:
        body = await chunk.read()
        s3.put_object(Bucket=S3_BUCKET, Key=s3_key, Body=body)

        existing = db.query(models.FileChunk).filter(
            models.FileChunk.file_id == file_id,
            models.FileChunk.chunk_index == chunk_index,
        ).first()
        if not existing:
            db.add(models.FileChunk(file_id=file_id, chunk_index=chunk_index, node=node))
        db.commit()

        return {"message": "Shard stored", "node": node}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- 3. DOWNLOAD FILE (Reassemble Shards) ---
@router.get("/download/{file_id}")
async def download_file(
    file_id: int, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    db_file = db.query(models.File).filter(
        models.File.id == file_id, 
        models.File.owner_id == current_user.id
    ).first()
    
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    temp_path = f"temp_{db_file.id}_{db_file.filename}"
    
    try:
        with open(temp_path, "wb") as f:
            # Reassemble by sorting chunks sequentially based on tracking table
            sorted_chunks = sorted(db_file.chunks, key=lambda x: x.chunk_index)
            
            for chunk in sorted_chunks:
                # Notice chunk.node reads dynamically from DB instead of global list!
                s3_key = get_s3_key(chunk.node, db_file.id, chunk.chunk_index)
                
                try:
                    response = s3.get_object(Bucket=S3_BUCKET, Key=s3_key)
                    f.write(response['Body'].read())
                except s3.exceptions.NoSuchKey:
                    raise HTTPException(status_code=500, detail="Reassembly failed: Shard missing on storage array nodes")

        background_tasks.add_task(os.remove, temp_path)
        return FileResponse(temp_path, filename=db_file.filename)
    
    except Exception as e:
        if os.path.exists(temp_path): os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))


# --- 4. DELETE FILE & REMOVE SHARDS ---
@router.delete("/delete/{file_id}")
def delete_file(
    file_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    db_file = db.query(models.File).filter(
        models.File.id == file_id, 
        models.File.owner_id == current_user.id
    ).first()
    
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    # Dynamically targets the correct chunk location regardless of historical matrix changes
    for chunk in db_file.chunks:
        s3_key = get_s3_key(chunk.node, db_file.id, chunk.chunk_index)
        try:
            s3.delete_object(Bucket=S3_BUCKET, Key=s3_key)
        except Exception as e:
            print(f"Warning: Failed to delete S3 shard {s3_key}: {e}")

    db.delete(db_file)
    db.commit()
    return {"message": "File and shards deleted successfully"}


# --- 5. MOVE FILE ---
@router.patch("/{file_id}/move")
def move_file(
    file_id: int, 
    new_folder_id: Optional[int] = None, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    db_file = db.query(models.File).filter(
        models.File.id == file_id, 
        models.File.owner_id == current_user.id
    ).first()
    
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    db_file.folder_id = new_folder_id
    db.commit()
    return {"message": "File moved successfully"}