"""
Media & Dish Photo Upload Router
Inspired by Cloudinary/Multer reference pipeline, built for Supabase Storage & local fallback.
Allows Shop Admins and Kitchen Staff to upload high-resolution photos of food items.
"""
import os
import time
import secrets
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel

router = APIRouter(prefix="/media", tags=["media"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

class ImageUploadResponse(BaseModel):
    success: bool
    url: str
    filename: str
    size_bytes: int

def init_media_router(sb, require_staff):
    @router.post("/upload-menu-image", response_model=ImageUploadResponse)
    async def upload_menu_image(
        file: UploadFile = File(...),
        user=Depends(require_staff)
    ):
        if file.content_type not in ALLOWED_TYPES:
            raise HTTPException(400, f"Unsupported image type {file.content_type}. Use JPEG, PNG, or WebP.")

        content = await file.read()
        size = len(content)
        if size > MAX_FILE_SIZE:
            raise HTTPException(400, "Image size exceeds 5MB limit.")

        ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
        unique_name = f"dish_{user.get('outlet_id', 'outlet')}_{int(time.time())}_{secrets.token_hex(4)}.{ext}"

        # 1. Try Supabase Storage bucket 'menu-items'
        public_url = None
        try:
            res = sb.storage.from_("menu-items").upload(
                path=unique_name,
                file=content,
                file_options={"content-type": file.content_type, "upsert": "true"}
            )
            # Retrieve public URL
            public_url = sb.storage.from_("menu-items").get_public_url(unique_name)
        except Exception as e:
            # Fallback for local dev/offline environments
            uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
            os.makedirs(uploads_dir, exist_ok=True)
            local_path = os.path.join(uploads_dir, unique_name)
            with open(local_path, "wb") as f:
                f.write(content)
            public_url = f"/uploads/{unique_name}"

        return ImageUploadResponse(
            success=True,
            url=public_url,
            filename=unique_name,
            size_bytes=size
        )

    return router
