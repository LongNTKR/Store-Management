"""API routes for AI configuration management."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from api.dependencies import get_db
from schemas.ai_config import (
    AIConfigCreate,
    AIConfigUpdate,
    AIConfigResponse,
    AIConfigDelete,
    MasterPasswordCreate,
    MasterPasswordVerify,
    MasterPasswordStatus,
    AIModelInfo,
    AIModelListResponse,
    AIModelSelect
)
from services.ai_config_service import AIConfigService
from services.ai_model_service import AIModelService

router = APIRouter(prefix="/api/ai-config", tags=["AI Configuration"])


@router.get("/master-password/status", response_model=MasterPasswordStatus)
async def get_master_password_status(db: Session = Depends(get_db)):
    """Check if master password is set."""
    is_set = AIConfigService.is_master_password_set(db)
    return MasterPasswordStatus(is_set=is_set)


@router.post("/master-password", status_code=status.HTTP_201_CREATED)
async def set_master_password(
    data: MasterPasswordCreate,
    db: Session = Depends(get_db)
):
    """Set or update master password."""
    try:
        AIConfigService.set_master_password(db, data.password)
        return {"message": "Master password set successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/master-password/verify")
async def verify_master_password(
    data: MasterPasswordVerify,
    db: Session = Depends(get_db)
):
    """Verify master password."""
    is_valid = AIConfigService.verify_master_password(db, data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid master password"
        )
    return {"message": "Password verified successfully"}


@router.get("", response_model=List[AIConfigResponse])
async def get_all_configs(db: Session = Depends(get_db)):
    """Get all AI configurations (without decrypted keys)."""
    return AIConfigService.get_all_configs(db)


@router.get("/{provider}", response_model=AIConfigResponse)
async def get_config(provider: str, db: Session = Depends(get_db)):
    """Get specific AI configuration by provider."""
    config = AIConfigService.get_config_by_provider(db, provider)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuration not found for provider: {provider}"
        )
    
    return AIConfigResponse(
        id=config.id,
        provider=config.provider,
        display_name=config.display_name,
        is_enabled=config.is_enabled,
        has_api_key=bool(config.api_key_encrypted),
        selected_model=config.selected_model,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.post("", response_model=AIConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_config(
    data: AIConfigCreate,
    db: Session = Depends(get_db)
):
    """Create or update AI configuration."""
    try:
        config = AIConfigService.create_or_update_config(
            db=db,
            provider=data.provider,
            api_key=data.api_key,
            is_enabled=data.is_enabled,
            master_password=data.master_password
        )
        
        return AIConfigResponse(
            id=config.id,
            provider=config.provider,
            display_name=config.display_name,
            is_enabled=config.is_enabled,
            has_api_key=bool(config.api_key_encrypted),
            selected_model=config.selected_model,
            created_at=config.created_at,
            updated_at=config.updated_at
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{provider}", response_model=AIConfigResponse)
async def update_config(
    provider: str,
    data: AIConfigUpdate,
    db: Session = Depends(get_db)
):
    """Update existing AI configuration."""
    try:
        # Verify password first
        if not AIConfigService.verify_master_password(db, data.master_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid master password"
            )
        
        # Get existing config
        config = AIConfigService.get_config_by_provider(db, provider)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Configuration not found for provider: {provider}"
            )
        
        # Update fields
        if data.api_key is not None:
            from utils.encryption import encrypt_api_key
            config.api_key_encrypted = encrypt_api_key(data.api_key)
        
        if data.is_enabled is not None:
            config.is_enabled = data.is_enabled
        
        db.commit()
        db.refresh(config)
        
        return AIConfigResponse(
            id=config.id,
            provider=config.provider,
            display_name=config.display_name,
            is_enabled=config.is_enabled,
            has_api_key=bool(config.api_key_encrypted),
            selected_model=config.selected_model,
            created_at=config.created_at,
            updated_at=config.updated_at
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{provider}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_config(
    provider: str,
    data: AIConfigDelete,
    db: Session = Depends(get_db)
):
    """Delete AI configuration."""
    try:
        deleted = AIConfigService.delete_config(db, provider, data.master_password)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Configuration not found for provider: {provider}"
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{provider}/toggle", response_model=AIConfigResponse)
async def toggle_provider(
    provider: str,
    is_enabled: bool,
    data: MasterPasswordVerify,
    db: Session = Depends(get_db)
):
    """Toggle provider enabled/disabled status."""
    try:
        config = AIConfigService.toggle_provider(
            db=db,
            provider=provider,
            is_enabled=is_enabled,
            master_password=data.password
        )
        
        return AIConfigResponse(
            id=config.id,
            provider=config.provider,
            display_name=config.display_name,
            is_enabled=config.is_enabled,
            has_api_key=bool(config.api_key_encrypted),
            selected_model=config.selected_model,
            created_at=config.created_at,
            updated_at=config.updated_at
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{provider}/models", response_model=AIModelListResponse)
async def get_available_models(
    provider: str,
    master_password: str,
    db: Session = Depends(get_db)
):
    """Get available models for a provider.
    
    Requires master password to decrypt API key and fetch models.
    """
    try:
        # Verify master password and get API key
        if not AIConfigService.verify_master_password(db, master_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid master password"
            )
        
        # Get config
        config = AIConfigService.get_config_by_provider(db, provider)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Configuration not found for provider: {provider}"
            )
        
        # Get decrypted API key
        api_key = AIConfigService.get_decrypted_api_key(db, provider, master_password)
        
        # Fetch models
        models = await AIModelService.get_models(provider, api_key)
        
        # Convert to response format
        model_infos = [AIModelInfo(**model) for model in models]
        
        return AIModelListResponse(models=model_infos)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{provider}/model", response_model=AIConfigResponse)
async def select_model(
    provider: str,
    data: AIModelSelect,
    db: Session = Depends(get_db)
):
    """Select a model for a provider."""
    try:
        config = AIConfigService.update_selected_model(
            db=db,
            provider=provider,
            model=data.model,
            master_password=data.master_password
        )
        
        return AIConfigResponse(
            id=config.id,
            provider=config.provider,
            display_name=config.display_name,
            is_enabled=config.is_enabled,
            has_api_key=bool(config.api_key_encrypted),
            selected_model=config.selected_model,
            created_at=config.created_at,
            updated_at=config.updated_at
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

