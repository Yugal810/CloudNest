from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import os
import uuid
import requests  # To fetch shards from nodes

from ..database import get_db
from .. import models
from ..auth import get_current_user  # Use the centralized auth dependency

router = APIRouter(prefix="/share", tags=["Sharing"])

# Get the base URL from Render environment variables, fallback to local for dev
BASE_URL = os.getenv("RENDER_EXTERNAL_URL", "http://127.0.0.1:8000")

# --- ROUTE 1: Generate the link (Requires Login) ---
@router.post("/{file_id}")
def generate_share_link(
    file_id: int, 
    expires_in_hours: int = 24, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify file ownership
    file = db.query(models.File).filter(
        models.File.id == file_id, 
        models.File.owner_id == current_user.id
    ).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found or access denied")

    expiration = datetime.utcnow() + timedelta(hours=expires_in_hours)
    
    # Create the unique link entry in DB
    new_link = models.SharedLink(
        file_id=file_id, 
        expires_at=expiration,
        share_token=str(uuid.uuid4()) # Ensure token is a string UUID
    )
    
    db.add(new_link)
    db.commit()
    db.refresh(new_link)

    return {
        "share_url": f"{BASE_URL}/share/download/{new_link.share_token}",
        "expires_at": expiration,
        "filename": file.filename
    }

# --- ROUTE 2: The Public Download (No Login Required) ---
@router.get("/download/{token}")
def download_shared_file(
    token: str, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    # 1. Validate the token and expiration
    link = db.query(models.SharedLink).filter(models.SharedLink.share_token == token).first()
    
    if not link or link.expires_at < datetime.utcnow():
        raise HTTPException(status_code=404, detail="This link is invalid or has expired")

    # 2. Get file metadata and its shards (chunks)
    file_record = db.query(models.File).filter(models.File.id == link.file_id).first()
    chunks = db.query(models.FileChunk).filter(
        models.FileChunk.file_id == file_record.id
    ).order_by(models.FileChunk.chunk_index).all()
    
    if not chunks:
        raise HTTPException(status_code=404, detail="File content not found on nodes")

    # 3. Reassemble the file into a temporary path on the Render server
    temp_filename = f"shared_{uuid.uuid4()}_{file_record.filename}"
    
    try:
        with open(temp_filename, "wb") as f_out:
            for chunk in chunks:
                # If chunk.node is a URL (e.g., another Render service or S3)
                if chunk.node.startswith("http"):
                    response = requests.get(chunk.node)
                    if response.status_code == 200:
                        f_out.write(response.content)
                else:
                    # If chunk.node is a local path (for your HP laptop testing)
                    chunk_path = os.path.join(chunk.node, f"file_{file_record.id}_chunk_{chunk.chunk_index}")
                    if os.path.exists(chunk_path):
                        with open(chunk_path, "rb") as f_in:
                            f_out.write(f_in.read())
                    else:
                        raise HTTPException(status_code=500, detail="Shard missing on node storage")

        # 4. Serve the file and delete the temp copy after download finishes
        background_tasks.add_task(os.remove, temp_filename)
        return FileResponse(
            temp_filename, 
            filename=file_record.filename,
            media_type='application/octet-stream'
        )

    except Exception as e:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        raise HTTPException(status_code=500, detail=f"Reassembly failed: {str(e)}")