"""Image-based product search service using Google Cloud Vision API."""

import os
from typing import List, Dict, Tuple, Optional
from google.cloud import vision
from google.cloud.vision_v1 import types
import numpy as np
from PIL import Image
import io
from sklearn.metrics.pairwise import cosine_similarity


class ImageSearchService:
    """Service for image-based product search."""

    def __init__(self, credentials_path: Optional[str] = None):
        """
        Initialize image search service.

        Args:
            credentials_path: Path to Google Cloud credentials JSON file
        """
        if credentials_path:
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path

        self.client = vision.ImageAnnotatorClient()

    def extract_image_features(self, image_path: str) -> Dict:
        """
        Extract features from an image using Google Vision API.

        Args:
            image_path: Path to image file

        Returns:
            Dictionary with image features including labels, objects, colors
        """
        with open(image_path, 'rb') as image_file:
            content = image_file.read()

        image = types.Image(content=content)

        # Get labels (what the image contains)
        labels_response = self.client.label_detection(image=image)
        labels = [label.description for label in labels_response.label_annotations[:10]]

        # Get objects (specific items detected)
        objects_response = self.client.object_localization(image=image)
        objects = [obj.name for obj in objects_response.localized_object_annotations[:10]]

        # Get dominant colors
        colors_response = self.client.image_properties(image=image)
        colors = []
        if colors_response.image_properties_annotation.dominant_colors.colors:
            for color in colors_response.image_properties_annotation.dominant_colors.colors[:5]:
                rgb = (
                    int(color.color.red),
                    int(color.color.green),
                    int(color.color.blue)
                )
                colors.append({
                    'rgb': rgb,
                    'score': color.score,
                    'pixel_fraction': color.pixel_fraction
                })

        # Get text in image (if any)
        text_response = self.client.text_detection(image=image)
        text = ""
        if text_response.text_annotations:
            text = text_response.text_annotations[0].description

        return {
            'labels': labels,
            'objects': objects,
            'colors': colors,
            'text': text
        }

    def compare_images(self, image1_path: str, image2_path: str) -> float:
        """
        Compare two images and return similarity score.

        Args:
            image1_path: Path to first image
            image2_path: Path to second image

        Returns:
            Similarity score between 0 and 1 (1 = identical)
        """
        features1 = self.extract_image_features(image1_path)
        features2 = self.extract_image_features(image2_path)

        # Calculate label similarity
        labels1 = set(features1['labels'])
        labels2 = set(features2['labels'])
        label_similarity = len(labels1 & labels2) / max(len(labels1 | labels2), 1)

        # Calculate object similarity
        objects1 = set(features1['objects'])
        objects2 = set(features2['objects'])
        object_similarity = len(objects1 & objects2) / max(len(objects1 | objects2), 1)

        # Calculate color similarity (simple approach)
        color_similarity = 0.5  # Default if no colors

        if features1['colors'] and features2['colors']:
            # Compare dominant colors
            color1 = features1['colors'][0]['rgb']
            color2 = features2['colors'][0]['rgb']

            # Calculate Euclidean distance in RGB space
            distance = np.sqrt(sum((c1 - c2) ** 2 for c1, c2 in zip(color1, color2)))
            max_distance = np.sqrt(3 * 255 ** 2)
            color_similarity = 1 - (distance / max_distance)

        # Calculate text similarity
        text1 = features1['text'].lower()
        text2 = features2['text'].lower()
        text_similarity = 0
        if text1 and text2:
            words1 = set(text1.split())
            words2 = set(text2.split())
            text_similarity = len(words1 & words2) / max(len(words1 | words2), 1)

        # Weighted average
        similarity = (
            label_similarity * 0.4 +
            object_similarity * 0.3 +
            color_similarity * 0.2 +
            text_similarity * 0.1
        )

        return similarity

    def search_similar_products(
        self,
        query_image_path: str,
        product_images: List[Tuple[int, str]],
        top_k: int = 5,
        threshold: float = 0.3
    ) -> List[Tuple[int, float]]:
        """
        Search for products with similar images.

        Args:
            query_image_path: Path to query image
            product_images: List of (product_id, image_path) tuples
            top_k: Number of top results to return
            threshold: Minimum similarity threshold (0-1)

        Returns:
            List of (product_id, similarity_score) tuples, sorted by score
        """
        query_features = self.extract_image_features(query_image_path)

        results = []
        for product_id, image_path in product_images:
            try:
                if not os.path.exists(image_path):
                    continue

                product_features = self.extract_image_features(image_path)

                # Calculate similarity
                labels1 = set(query_features['labels'])
                labels2 = set(product_features['labels'])
                label_similarity = len(labels1 & labels2) / max(len(labels1 | labels2), 1)

                objects1 = set(query_features['objects'])
                objects2 = set(product_features['objects'])
                object_similarity = len(objects1 & objects2) / max(len(objects1 | objects2), 1)

                color_similarity = 0.5
                if query_features['colors'] and product_features['colors']:
                    color1 = query_features['colors'][0]['rgb']
                    color2 = product_features['colors'][0]['rgb']
                    distance = np.sqrt(sum((c1 - c2) ** 2 for c1, c2 in zip(color1, color2)))
                    max_distance = np.sqrt(3 * 255 ** 2)
                    color_similarity = 1 - (distance / max_distance)

                text1 = query_features['text'].lower()
                text2 = product_features['text'].lower()
                text_similarity = 0
                if text1 and text2:
                    words1 = set(text1.split())
                    words2 = set(text2.split())
                    text_similarity = len(words1 & words2) / max(len(words1 | words2), 1)

                similarity = (
                    label_similarity * 0.4 +
                    object_similarity * 0.3 +
                    color_similarity * 0.2 +
                    text_similarity * 0.1
                )

                if similarity >= threshold:
                    results.append((product_id, similarity))

            except Exception as e:
                print(f"Error processing {image_path}: {e}")
                continue

        # Sort by similarity (descending)
        results.sort(key=lambda x: x[1], reverse=True)

        return results[:top_k]

    def detect_objects_in_image(self, image_path: str) -> List[Dict]:
        """
        Detect objects in an image with bounding boxes.

        Args:
            image_path: Path to image file

        Returns:
            List of detected objects with names and bounding boxes
        """
        with open(image_path, 'rb') as image_file:
            content = image_file.read()

        image = types.Image(content=content)
        response = self.client.object_localization(image=image)

        objects = []
        for obj in response.localized_object_annotations:
            vertices = [(vertex.x, vertex.y) for vertex in obj.bounding_poly.normalized_vertices]

            objects.append({
                'name': obj.name,
                'confidence': obj.score,
                'bounding_box': vertices
            })

        return objects

    def get_web_similar_images(self, image_path: str, max_results: int = 10) -> List[Dict]:
        """
        Find similar images on the web (useful for identifying unknown products).

        Args:
            image_path: Path to image file
            max_results: Maximum number of results

        Returns:
            List of similar images found on the web
        """
        with open(image_path, 'rb') as image_file:
            content = image_file.read()

        image = types.Image(content=content)
        response = self.client.web_detection(image=image)

        results = []
        if response.web_detection.web_entities:
            for entity in response.web_detection.web_entities[:max_results]:
                results.append({
                    'description': entity.description,
                    'score': entity.score
                })

        return results
