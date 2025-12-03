"""
Real-time search component with instant keystroke detection
"""
import streamlit as st
from st_keyup import st_keyup


def instant_search(
    placeholder: str = "🔍 Tìm kiếm...",
    key: str = "search",
    label: str = "",  # Empty label to hide it
    debounce_ms: int = 100  # Very short debounce just to avoid too many reruns
) -> tuple[str, bool]:
    """
    Create a real-time search input that searches instantly as you type.
    No need to press Enter - search happens in real-time!
    
    Args:
        placeholder: Placeholder text for the search input
        key: Unique key for the search input
        label: Label for the search input (default empty to hide)
        debounce_ms: Minimal debounce to avoid excessive reruns (default 100ms)
    
    Returns:
        Tuple of (search_query, is_searching)
        - search_query: The current search query
        - is_searching: Always False (no loading state needed)
    """
    # Use st_keyup to capture keystrokes in real-time
    current_input = st_keyup(
        label=label,  # Use the provided label parameter
        placeholder=placeholder,
        key=f"{key}_keyup",
        debounce=debounce_ms,  # Minimal debounce
    )
    
    # Handle None return value
    if current_input is None:
        current_input = ""
    
    # Return current input immediately, no loading state
    return current_input, False
