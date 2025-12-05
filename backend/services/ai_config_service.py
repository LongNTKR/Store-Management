"""Service for managing AI configurations."""

from typing import List, Optional
from sqlalchemy.orm import Session
from database.models import AIConfiguration, MasterPassword
from schemas.ai_config import AIConfigResponse
from utils.encryption import encrypt_api_key, decrypt_api_key
from utils.password import hash_password, verify_password


# Provider display names mapping
PROVIDER_DISPLAY_NAMES = {
    'google': 'Google AI',
    'openai': 'OpenAI',
    'grok': 'Grok (xAI)',
    'claude': 'Claude (Anthropic)',
    'deepseek': 'DeepSeek',
    'qwen': 'Qwen (Alibaba)'
}


class AIConfigService:
    """Service for managing AI configurations."""
    
    @staticmethod
    def is_master_password_set(db: Session) -> bool:
        """Check if master password is set.
        
        Args:
            db: Database session
        
        Returns:
            True if master password exists, False otherwise
        """
        return db.query(MasterPassword).first() is not None
    
    @staticmethod
    def set_master_password(db: Session, password: str) -> None:
        """Set or update master password.
        
        Args:
            db: Database session
            password: New master password
        
        Raises:
            ValueError: If password is invalid
        """
        if not password or len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        # Hash the password
        hashed = hash_password(password)
        
        # Check if password already exists
        master_pwd = db.query(MasterPassword).first()
        if master_pwd:
            master_pwd.password_hash = hashed
        else:
            master_pwd = MasterPassword(password_hash=hashed)
            db.add(master_pwd)
        
        db.commit()
    
    @staticmethod
    def verify_master_password(db: Session, password: str) -> bool:
        """Verify master password.
        
        Args:
            db: Database session
            password: Password to verify
        
        Returns:
            True if password is correct, False otherwise
        """
        master_pwd = db.query(MasterPassword).first()
        if not master_pwd:
            return False
        
        return verify_password(password, master_pwd.password_hash)
    
    @staticmethod
    def get_all_configs(db: Session) -> List[AIConfigResponse]:
        """Get all AI configurations (without decrypted keys).
        
        Args:
            db: Database session
        
        Returns:
            List of AI configuration responses
        """
        configs = db.query(AIConfiguration).all()
        
        return [
            AIConfigResponse(
                id=config.id,
                provider=config.provider,
                display_name=config.display_name,
                is_enabled=config.is_enabled,
                has_api_key=bool(config.api_key_encrypted),
                selected_model=config.selected_model,
                created_at=config.created_at,
                updated_at=config.updated_at
            )
            for config in configs
        ]
    
    @staticmethod
    def get_config_by_provider(db: Session, provider: str) -> Optional[AIConfiguration]:
        """Get AI configuration by provider.
        
        Args:
            db: Database session
            provider: Provider name
        
        Returns:
            AI configuration or None
        """
        return db.query(AIConfiguration).filter(
            AIConfiguration.provider == provider.lower()
        ).first()
    
    @staticmethod
    def create_or_update_config(
        db: Session,
        provider: str,
        api_key: str,
        is_enabled: bool = True,
        master_password: str = None
    ) -> AIConfiguration:
        """Create or update AI configuration.
        
        Args:
            db: Database session
            provider: Provider name
            api_key: API key to encrypt and store
            is_enabled: Whether provider is enabled
            master_password: Master password for verification (optional if creating first time)
        
        Returns:
            Created or updated AI configuration
        
        Raises:
            ValueError: If password verification fails or API key is invalid
        """
        provider = provider.lower()
        
        # Verify master password if it's set
        if AIConfigService.is_master_password_set(db):
            if not master_password:
                raise ValueError("Master password is required")
            if not AIConfigService.verify_master_password(db, master_password):
                raise ValueError("Invalid master password")
        
        # Validate API key
        if not api_key or not api_key.strip():
            raise ValueError("API key cannot be empty")
        
        # Encrypt API key
        encrypted_key = encrypt_api_key(api_key.strip())
        
        # Get display name
        display_name = PROVIDER_DISPLAY_NAMES.get(provider, provider.title())
        
        # Check if config exists
        config = AIConfigService.get_config_by_provider(db, provider)
        
        if config:
            # Update existing
            config.api_key_encrypted = encrypted_key
            config.is_enabled = is_enabled
            config.display_name = display_name
        else:
            # Create new
            config = AIConfiguration(
                provider=provider,
                display_name=display_name,
                api_key_encrypted=encrypted_key,
                is_enabled=is_enabled
            )
            db.add(config)
        
        db.commit()
        db.refresh(config)
        return config
    
    @staticmethod
    def get_decrypted_api_key(db: Session, provider: str, master_password: str) -> str:
        """Get decrypted API key for a provider.
        
        Args:
            db: Database session
            provider: Provider name
            master_password: Master password for verification
        
        Returns:
            Decrypted API key
        
        Raises:
            ValueError: If password verification fails or provider not found
        """
        # Verify master password
        if not AIConfigService.verify_master_password(db, master_password):
            raise ValueError("Invalid master password")
        
        # Get config
        config = AIConfigService.get_config_by_provider(db, provider)
        if not config:
            raise ValueError(f"No configuration found for provider: {provider}")
        
        # Decrypt and return
        return decrypt_api_key(config.api_key_encrypted)

    @staticmethod
    def get_decrypted_api_key_internal(db: Session, provider: str) -> str:
        """Get decrypted API key for a provider (Internal use only).
        
        WARNING: This method does NOT verify the master password.
        It should only be used for internal backend processes where
        user authorization has already been established or is not required.
        
        Args:
            db: Database session
            provider: Provider name
        
        Returns:
            Decrypted API key
        
        Raises:
            ValueError: If provider not found
        """
        # Get config
        config = AIConfigService.get_config_by_provider(db, provider)
        if not config:
            raise ValueError(f"No configuration found for provider: {provider}")
        
        # Decrypt and return
        return decrypt_api_key(config.api_key_encrypted)
    
    @staticmethod
    def delete_config(db: Session, provider: str, master_password: str) -> bool:
        """Delete AI configuration.
        
        Args:
            db: Database session
            provider: Provider name
            master_password: Master password for verification
        
        Returns:
            True if deleted, False if not found
        
        Raises:
            ValueError: If password verification fails
        """
        # Verify master password
        if not AIConfigService.verify_master_password(db, master_password):
            raise ValueError("Invalid master password")
        
        # Get and delete config
        config = AIConfigService.get_config_by_provider(db, provider)
        if not config:
            return False
        
        db.delete(config)
        db.commit()
        return True
    
    @staticmethod
    def toggle_provider(db: Session, provider: str, is_enabled: bool, master_password: str) -> AIConfiguration:
        """Enable or disable a provider.
        
        Args:
            db: Database session
            provider: Provider name
            is_enabled: New enabled status
            master_password: Master password for verification
        
        Returns:
            Updated AI configuration
        
        Raises:
            ValueError: If password verification fails or provider not found
        """
        # Verify master password
        if not AIConfigService.verify_master_password(db, master_password):
            raise ValueError("Invalid master password")
        
        # Get config
        config = AIConfigService.get_config_by_provider(db, provider)
        if not config:
            raise ValueError(f"No configuration found for provider: {provider}")
        
        # Update status
        config.is_enabled = is_enabled
        db.commit()
        db.refresh(config)
        return config
    
    @staticmethod
    def update_selected_model(
        db: Session,
        provider: str,
        model: str,
        master_password: str
    ) -> AIConfiguration:
        """Update selected model for a provider.
        
        Args:
            db: Database session
            provider: Provider name
            model: Model ID to select
            master_password: Master password for verification
        
        Returns:
            Updated AI configuration
        
        Raises:
            ValueError: If password verification fails or provider not found
        """
        # Verify master password
        if not AIConfigService.verify_master_password(db, master_password):
            raise ValueError("Invalid master password")
        
        # Get config
        config = AIConfigService.get_config_by_provider(db, provider)
        if not config:
            raise ValueError(f"No configuration found for provider: {provider}")
        
        # Update selected model
        config.selected_model = model
        db.commit()
        db.refresh(config)
        return config

