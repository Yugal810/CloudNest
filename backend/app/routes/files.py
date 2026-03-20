from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from jose import jwt, JWTError
import os
import boto3
from datetime import datetime 
from dotenv import load_dotenv
from typing import Optional

from ..database import get_db
from .. import models, auth

load_dotenv()
router = APIRouter(tags=["Files"])

s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)
BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME")
NODES = ["node1", "node2", "node3"]
CHUNK_SIZE = 1024 * 1024 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def remove_file(path: str):
    if os.path.exists(path):
        os.remove(path)

# --- UPLOAD FILE (With Duplicate Check) ---
@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...), 
    folder_id: Optional[int] = None, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Check if a file with the same name already exists in this folder
    existing_file = db.query(models.File).filter(
        models.File.filename == file.filename,
        models.File.folder_id == folder_id,
        models.File.owner_id == current_user.id
    ).first()

    if existing_file:
        raise HTTPException(
            status_code=400, 
            detail="A file with this name already exists in this folder."
        )

    file_data = await file.read()

    # 2. Database Entry
    db_file = models.File(
        filename=file.filename,
        owner_id=current_user.id,
        folder_id=folder_id,
        size=len(file_data),             
        created_at=datetime.utcnow()
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    # 3. Sharding & Distribution
    chunks = [file_data[i:i+CHUNK_SIZE] for i in range(0, len(file_data), CHUNK_SIZE)]
    for i, chunk in enumerate(chunks):
        node = NODES[i % len(NODES)]
        chunk_name = f"file_{db_file.id}_chunk_{i}"
        s3_key = f"{node}/{chunk_name}" 
        s3_client.put_object(Bucket=BUCKET_NAME, Key=s3_key, Body=chunk)
        
        db_chunk = models.FileChunk(
            file_id=db_file.id,
            chunk_index=i,
            node=node 
        )
        db.add(db_chunk)

    db.commit()
    return {"message": "File uploaded successfully", "file_id": db_file.id}

@router.get("/download/{file_id}")
def download_file(
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

    chunks = db.query(models.FileChunk).filter(models.FileChunk.file_id == file_id).order_by(models.FileChunk.chunk_index).all()
    output_path = f"temp_{db_file.id}_{db_file.filename}"
    
    with open(output_path, "wb") as output_file:
        for chunk in chunks:
            s3_key = f"{chunk.node}/file_{db_file.id}_chunk_{chunk.chunk_index}"
            response = s3_client.get_object(Bucket=BUCKET_NAME, Key=s3_key)
            output_file.write(response['Body'].read())

    background_tasks.add_task(remove_file, output_path)
    return FileResponse(path=output_path, filename=db_file.filename)

@router.delete("/delete/{file_id}")
def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_file = db.query(models.File).filter(models.File.id == file_id, models.File.owner_id == current_user.id).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    chunks = db.query(models.FileChunk).filter(models.FileChunk.file_id == file_id).all()
    for chunk in chunks:
        s3_key = f"{chunk.node}/file_{file_id}_chunk_{chunk.chunk_index}"
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=s3_key)

    db.delete(db_file)
    db.commit()
    return {"detail": "File deleted"}

@router.patch("/{file_id}/move")
def move_file(
    file_id: int, 
    new_folder_id: Optional[int] = None, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    file = db.query(models.File).filter(
        models.File.id == file_id, 
        models.File.owner_id == current_user.id
    ).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    if new_folder_id is not None:
        folder_exists = db.query(models.Folder).filter(
            models.Folder.id == new_folder_id, 
            models.Folder.owner_id == current_user.id
        ).first()
        if not folder_exists:
            raise HTTPException(status_code=400, detail="Target folder not found")

    file.folder_id = new_folder_id
    db.commit()
    return {"message": "Success"}