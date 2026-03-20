from dotenv import load_dotenv
import os
import boto3
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
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
NODES = ["node1", "node2", "node3"]

# --- HELPER: Unified S3 Key Generator ---
def get_s3_key(node: str, file_id: int, chunk_index: int):
    """Ensures Upload and Download always look for the exact same string."""
    return f"{node}/file_{file_id}_chunk_{chunk_index}"

# --- 1. UPLOAD FILE ---
@router.post("/upload")
async def upload_file(
    folder_id: Optional[int] = None, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    # Prevent duplicate filenames in the same directory
    existing = db.query(models.File).filter(
        models.File.owner_id == current_user.id,
        models.File.folder_id == folder_id,
        models.File.filename == file.filename
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="File already exists in this folder")

    # Save metadata first to generate the unique File ID
    db_file = models.File(filename=file.filename, owner_id=current_user.id, folder_id=folder_id)
    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    try:
        content = await file.read()
        db_file.size = len(content)
        
        # Define 1MB Chunks
        chunk_size = 1024 * 1024 
        num_chunks = (len(content) + chunk_size - 1) // chunk_size

        for i in range(num_chunks):
            chunk_data = content[i * chunk_size : (i + 1) * chunk_size]
            node = NODES[i % len(NODES)]
            
            # Use unified key generator
            s3_key = get_s3_key(node, db_file.id, i)
            
            # Upload to S3
            s3.put_object(Bucket=S3_BUCKET, Key=s3_key, Body=chunk_data)
            
            # Save Chunk Metadata
            db_chunk = models.FileChunk(file_id=db_file.id, chunk_index=i, node=node)
            db.add(db_chunk)
        
        db.commit()
        return {"message": "File sharded and uploaded successfully", "file_id": db_file.id}

    except Exception as e:
        db.delete(db_file) # Cleanup metadata if S3 upload fails
        db.commit()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# --- 2. DOWNLOAD FILE (Private) ---
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

    # Use a unique temp path to prevent collisions during concurrent downloads
    temp_path = f"temp_{db_file.id}_{db_file.filename}"
    
    try:
        with open(temp_path, "wb") as f:
            # Sort chunks by index to ensure correct reassembly order
            sorted_chunks = sorted(db_file.chunks, key=lambda x: x.chunk_index)
            
            for chunk in sorted_chunks:
                s3_key = get_s3_key(chunk.node, db_file.id, chunk.chunk_index)
                
                try:
                    response = s3.get_object(Bucket=S3_BUCKET, Key=s3_key)
                    f.write(response['Body'].read())
                except s3.exceptions.NoSuchKey:
                    print(f"CRITICAL ERROR: Shard {s3_key} not found in S3!")
                    raise HTTPException(status_code=500, detail="Reassembly failed: Shard missing on node storage")

        background_tasks.add_task(os.remove, temp_path)
        return FileResponse(temp_path, filename=db_file.filename)
    
    except Exception as e:
        if os.path.exists(temp_path): os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

# --- 3. DELETE FILE ---
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

    # Delete shards from S3 first
    for chunk in db_file.chunks:
        s3_key = get_s3_key(chunk.node, db_file.id, chunk.chunk_index)
        try:
            s3.delete_object(Bucket=S3_BUCKET, Key=s3_key)
        except Exception as e:
            print(f"Warning: Failed to delete S3 shard {s3_key}: {e}")

    db.delete(db_file)
    db.commit()
    return {"message": "File and shards deleted successfully"}

# --- 4. MOVE FILE ---
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