"""Pydantic schemas for AI configuration."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, validator


class AIConfigCreate(BaseModel):
    """Schema for creating/updating AI configuration."""
    
    provider: str = Field(..., description="AI provider name (google, openai, grok, claude, deepseek, qwen)")
    api_key: str = Field(..., min_length=1, description="API key for the provider")
    is_enabled: bool = Field(default=True, description="Enable/disable this provider")
    master_password: str = Field(..., min_length=1, description="Master password for verification")
    
    @validator('provider')
    def validate_provider(cls, v):
        allowed_providers = ['google', 'openai', 'grok', 'claude', 'deepseek', 'qwen']
        if v.lower() not in allowed_providers:
            raise ValueError(f"Provider must be one of: {', '.join(allowed_providers)}")
        return v.lower()


class AIConfigUpdate(BaseModel):
    """Schema for updating existing AI configuration."""
    
    api_key: Optional[str] = Field(None, min_length=1, description="New API key")
    is_enabled: Optional[bool] = Field(None, description="Enable/disable this provider")
    master_password: str = Field(..., min_length=1, description="Master password for verification")


class AIConfigResponse(BaseModel):
    """Schema for AI configuration response (without exposing API key)."""
    
    id: int
    provider: str
    display_name: str
    is_enabled: bool
    has_api_key: bool = Field(..., description="Whether an API key is configured")
    selected_model: Optional[str] = Field(None, description="Currently selected model")
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AIConfigDelete(BaseModel):
    """Schema for deleting AI configuration."""
    
    master_password: str = Field(..., min_length=1, description="Master password for verification")


class MasterPasswordCreate(BaseModel):
    """Schema for creating/updating master password."""
    
    password: str = Field(..., min_length=8, description="Master password (minimum 8 characters)")
    confirm_password: str = Field(..., description="Confirm password")
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v


class MasterPasswordVerify(BaseModel):
    """Schema for verifying master password."""
    
    password: str = Field(..., min_length=1, description="Master password to verify")


class MasterPasswordStatus(BaseModel):
    """Schema for master password status response."""
    
    is_set: bool = Field(..., description="Whether master password is configured")


class AIModelInfo(BaseModel):
    """Schema for AI model information."""
    
    id: str = Field(..., description="Model identifier")
    name: str = Field(..., description="Display name")
    description: str = Field(default="", description="Model description")


class AIModelListResponse(BaseModel):
    """Schema for list of available models."""
    
    models: List[AIModelInfo]


class AIModelSelect(BaseModel):
    """Schema for selecting a model."""
    
    model: str = Field(..., min_length=1, description="Model ID to select")
    master_password: str = Field(..., min_length=1, description="Master password for verification")

