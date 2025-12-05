"""Service for managing AI models and fetching available models from providers."""

import httpx
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from functools import lru_cache


# Cache for model lists (1 hour TTL)
_model_cache: Dict[str, tuple[List[Dict], datetime]] = {}
CACHE_TTL = timedelta(hours=1)


# Fallback model lists for providers without public list APIs
FALLBACK_MODELS = {
    'claude': [
        {'id': 'claude-3-5-sonnet-20241022', 'name': 'Claude 3.5 Sonnet', 'description': 'Most intelligent model'},
        {'id': 'claude-3-5-haiku-20241022', 'name': 'Claude 3.5 Haiku', 'description': 'Fastest model'},
        {'id': 'claude-3-opus-20240229', 'name': 'Claude 3 Opus', 'description': 'Powerful model for complex tasks'},
        {'id': 'claude-3-haiku-20240307', 'name': 'Claude 3 Haiku', 'description': 'Fast and compact model'},
    ],
    'grok': [
        {'id': 'grok-2-vision-1212', 'name': 'Grok 2 Vision', 'description': 'Vision-capable model for image analysis'},
        {'id': 'grok-4-1-fast-reasoning', 'name': 'Grok 4.1 Fast Reasoning', 'description': 'Fast reasoning model'},
        {'id': 'grok-2-1212', 'name': 'Grok 2', 'description': 'Latest Grok model'},
        {'id': 'grok-2-mini', 'name': 'Grok 2 Mini', 'description': 'Compact version'},
    ],
    'deepseek': [
        {'id': 'deepseek-chat', 'name': 'DeepSeek Chat', 'description': 'General purpose chat model'},
        {'id': 'deepseek-coder', 'name': 'DeepSeek Coder', 'description': 'Specialized coding model'},
    ],
    'qwen': [
        {'id': 'qwen-max', 'name': 'Qwen Max', 'description': 'Most capable model'},
        {'id': 'qwen-plus', 'name': 'Qwen Plus', 'description': 'Balanced performance'},
        {'id': 'qwen-turbo', 'name': 'Qwen Turbo', 'description': 'Fast responses'},
    ]
}


class AIModelService:
    """Service for fetching and managing AI models."""
    
    @staticmethod
    async def get_models(provider: str, api_key: str) -> List[Dict]:
        """Get available models for a provider.
        
        Args:
            provider: Provider name (google, openai, grok, claude, deepseek, qwen)
            api_key: API key for the provider
        
        Returns:
            List of model dictionaries with 'id', 'name', and 'description'
        
        Raises:
            ValueError: If provider is invalid or API call fails
        """
        provider = provider.lower()
        
        # Check cache first
        if provider in _model_cache:
            cached_models, cached_at = _model_cache[provider]
            if datetime.now() - cached_at < CACHE_TTL:
                return cached_models
        
        # Fetch models based on provider
        models = []
        
        if provider == 'google':
            models = await AIModelService._fetch_google_models(api_key)
        elif provider == 'openai':
            models = await AIModelService._fetch_openai_models(api_key)
        elif provider in FALLBACK_MODELS:
            models = FALLBACK_MODELS[provider]
        else:
            raise ValueError(f"Unknown provider: {provider}")
        
        # Cache the results
        _model_cache[provider] = (models, datetime.now())
        
        return models
    
    @staticmethod
    async def _fetch_google_models(api_key: str) -> List[Dict]:
        """Fetch models from Google AI API.
        
        Args:
            api_key: Google AI API key
        
        Returns:
            List of model dictionaries
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    'https://generativelanguage.googleapis.com/v1beta/models',
                    params={'key': api_key},
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()
                
                # Filter to only generative models and format
                models = []
                for model in data.get('models', []):
                    model_id = model.get('name', '').replace('models/', '')
                    
                    # Only include generative models
                    if 'generateContent' in model.get('supportedGenerationMethods', []):
                        models.append({
                            'id': model_id,
                            'name': model.get('displayName', model_id),
                            'description': model.get('description', '')
                        })
                
                return models
        except httpx.HTTPError as e:
            raise ValueError(f"Failed to fetch Google AI models: {str(e)}")
    
    @staticmethod
    async def _fetch_openai_models(api_key: str) -> List[Dict]:
        """Fetch models from OpenAI API.
        
        Args:
            api_key: OpenAI API key
        
        Returns:
            List of model dictionaries
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    'https://api.openai.com/v1/models',
                    headers={'Authorization': f'Bearer {api_key}'},
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()
                
                # Filter to chat models and format
                models = []
                for model in data.get('data', []):
                    model_id = model.get('id', '')
                    
                    # Only include GPT models (chat models)
                    if 'gpt' in model_id.lower():
                        models.append({
                            'id': model_id,
                            'name': model_id.upper().replace('-', ' '),
                            'description': f"OpenAI {model_id}"
                        })
                
                # Sort by name for better UX
                models.sort(key=lambda x: x['id'], reverse=True)
                
                return models
        except httpx.HTTPError as e:
            raise ValueError(f"Failed to fetch OpenAI models: {str(e)}")
    
    @staticmethod
    def clear_cache(provider: Optional[str] = None):
        """Clear model cache.
        
        Args:
            provider: Optional provider to clear cache for. If None, clears all.
        """
        if provider:
            _model_cache.pop(provider.lower(), None)
        else:
            _model_cache.clear()
