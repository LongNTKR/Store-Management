"""
Fuzzy matching utility for finding similar product names.
Uses rapidfuzz for efficient similarity scoring.
"""
from typing import List, Tuple
from rapidfuzz import fuzz, process


def normalize_for_matching(text: str) -> str:
    """
    Normalize text for better fuzzy matching.

    Args:
        text: Input text

    Returns:
        Normalized text (lowercase, stripped)
    """
    if not text:
        return ""
    return text.lower().strip()


def find_similar_products(
    detected_name: str,
    existing_products: List,  # List of Product objects
    threshold: int = 80,
    limit: int = 5
) -> List[Tuple[any, float]]:
    """
    Find existing products with similar names using fuzzy matching.

    Args:
        detected_name: Name detected from AI/OCR
        existing_products: List of Product model instances
        threshold: Minimum similarity score (0-100), default 80
        limit: Maximum number of matches to return

    Returns:
        List of tuples (Product, similarity_score) sorted by score DESC
        Only includes matches with score >= threshold
    """
    if not detected_name or not existing_products:
        return []

    # Normalize detected name
    normalized_detected = normalize_for_matching(detected_name)

    # Create mapping of normalized names to products
    product_map = {}
    normalized_names = []

    for product in existing_products:
        # Use normalized_name if available, otherwise normalize the name
        normalized = getattr(product, 'normalized_name', None)
        if not normalized:
            normalized = normalize_for_matching(product.name)

        product_map[normalized] = product
        normalized_names.append(normalized)

    # Find matches using rapidfuzz
    matches = process.extract(
        normalized_detected,
        normalized_names,
        scorer=fuzz.ratio,
        limit=limit
    )

    # Filter by threshold and convert to (Product, score) tuples
    results = []
    for matched_name, score, _ in matches:
        if score >= threshold:
            product = product_map[matched_name]
            results.append((product, score))

    return results


def is_exact_match(name1: str, name2: str) -> bool:
    """
    Check if two product names are an exact match (case-insensitive, normalized).

    Args:
        name1: First name
        name2: Second name

    Returns:
        True if names match exactly after normalization
    """
    return normalize_for_matching(name1) == normalize_for_matching(name2)


def calculate_similarity(name1: str, name2: str) -> float:
    """
    Calculate similarity score between two product names.

    Args:
        name1: First name
        name2: Second name

    Returns:
        Similarity score from 0 to 100
    """
    if not name1 or not name2:
        return 0.0

    norm1 = normalize_for_matching(name1)
    norm2 = normalize_for_matching(name2)

    return fuzz.ratio(norm1, norm2)
