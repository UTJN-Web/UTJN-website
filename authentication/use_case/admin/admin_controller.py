from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import base64
import os
from datetime import datetime
import uuid

router = APIRouter(prefix="/admin", tags=["admin"])

class ImageUploadRequest(BaseModel):
    imageData: str  # Base64 encoded image
    fileName: str
    eventId: int = None

@router.post("/upload-image")
async def upload_image(request: ImageUploadRequest):
    """Upload image and save to database"""
    try:
        # Validate base64 data
        if not request.imageData.startswith('data:image/'):
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Extract image data from base64
        header, encoded = request.imageData.split(",", 1)
        image_data = base64.b64decode(encoded)
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        file_extension = request.fileName.split('.')[-1].lower()
        unique_filename = f"event_{request.eventId or 'new'}_{timestamp}_{unique_id}.{file_extension}"
        
        # Create uploads directory if it doesn't exist
        upload_dir = "uploads/event_images"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save image file
        file_path = os.path.join(upload_dir, unique_filename)
        with open(file_path, "wb") as f:
            f.write(image_data)
        
        # Generate URL for the image (use backend URL)
        backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
        image_url = f"{backend_url}/uploads/event_images/{unique_filename}"
        
        # TODO: Save image metadata to database if needed
        # For now, we'll just return the URL
        
        return {
            "success": True,
            "imageUrl": image_url,
            "fileName": unique_filename
        }
        
    except Exception as e:
        print(f"Error uploading image: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload image")

@router.get("/unregistered-refunds")
async def get_unregistered_refunds_admin(
    email: Optional[str] = Query(None, description="Filter by specific email address"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Admin endpoint for unregistered refunds with email filtering"""
    try:
        # Forward the request to the unregistered payments endpoint
        from authentication.use_case.unregistered_payments.unregistered_payments_controller import get_unregistered_payments
        
        # Call the unregistered payments function directly
        result = await get_unregistered_payments(email, start_date, end_date)
        
        return result
        
    except Exception as e:
        print(f"❌ Error in admin unregistered refunds: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve unregistered refunds: {str(e)}") 