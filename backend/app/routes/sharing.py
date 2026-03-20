from dotenv import load_dotenv
import os
import uuid
import boto3
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from ..auth import get_current_user

load_dotenv()

router = APIRouter(prefix="/share", tags=["Sharing"])

# AWS S3 Configuration (Must match files.py)
s3 = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION")
)

S3_BUCKET = os.getenv("AWS_S3_BUCKET_NAME")
BASE_URL = os.getenv("RENDER_EXTERNAL_URL", "http://127.0.0.1:8000")

# --- HELPER: Unified S3 Key Generator (Must match files.py) ---
def get_s3_key(node: str, file_id: int, chunk_index: int):
    return f"{node}/file_{file_id}_chunk_{chunk_index}"

# --- ROUTE 1: Generate the link (Requires Login) ---
@router.post("/{file_id}")
def generate_share_link(
    file_id: int, 
    expires_in_hours: int = 24, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    file = db.query(models.File).filter(
        models.File.id == file_id, 
        models.File.owner_id == current_user.id
    ).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found or access denied")

    expiration = datetime.utcnow() + timedelta(hours=expires_in_hours)
    
    new_link = models.SharedLink(
        file_id=file_id, 
        expires_at=expiration,
        share_token=str(uuid.uuid4())
    )
    
    db.add(new_link)
    db.commit()
    db.refresh(new_link)

    return {
        "share_url": f"{BASE_URL}/share/download/{new_link.share_token}",
        "expires_at": expiration,
        "filename": file.filename
    }

# --- ROUTE 2: The Public Download (S3 Reassembly) ---
@router.get("/download/{token}")
async def download_shared_file(
    token: str, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    # 1. Validate the token
    link = db.query(models.SharedLink).filter(models.SharedLink.share_token == token).first()
    if not link or link.expires_at < datetime.utcnow():
        raise HTTPException(status_code=404, detail="This link is invalid or has expired")

    # 2. Get file metadata
    file_record = db.query(models.File).filter(models.File.id == link.file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File record missing")

    # 3. Reassemble from S3
    temp_filename = f"shared_temp_{uuid.uuid4()}_{file_record.filename}"
    
    try:
        with open(temp_filename, "wb") as f_out:
            # Sort chunks by index to ensure correct reassembly
            sorted_chunks = sorted(file_record.chunks, key=lambda x: x.chunk_index)
            
            for chunk in sorted_chunks:
                # Use the exact same key format as files.py
                s3_key = get_s3_key(chunk.node, file_record.id, chunk.chunk_index)
                
                try:
                    response = s3.get_object(Bucket=S3_BUCKET, Key=s3_key)
                    f_out.write(response['Body'].read())
                except s3.exceptions.NoSuchKey:
                    print(f"SHARING ERROR: Shard {s3_key} missing in S3")
                    raise HTTPException(status_code=500, detail="Reassembly failed: Shard missing on node storage")

        # 4. Serve and Cleanup
        background_tasks.add_task(os.remove, temp_filename)
        return FileResponse(
            temp_filename, 
            filename=file_record.filename,
            media_type='application/octet-stream'
        )

    except Exception as e:
        if os.path.exists(temp_filename): os.remove(temp_filename)
        raise HTTPException(status_code=500, detail=f"Download Error: {str(e)}")