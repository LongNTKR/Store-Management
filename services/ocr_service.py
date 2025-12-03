"""OCR Service using Google Cloud Vision API."""

import os
import re
from typing import List, Dict, Optional, Tuple
from google.cloud import vision
from google.cloud.vision_v1 import types
import pandas as pd
from PIL import Image
import io


class OCRService:
    """Service for OCR operations using Google Cloud Vision API."""

    def __init__(self, credentials_path: Optional[str] = None):
        """
        Initialize OCR service.

        Args:
            credentials_path: Path to Google Cloud credentials JSON file
        """
        if credentials_path:
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path

        self.client = vision.ImageAnnotatorClient()

    def extract_text_from_image(self, image_path: str) -> str:
        """
        Extract text from an image file.

        Args:
            image_path: Path to image file

        Returns:
            Extracted text
        """
        with open(image_path, 'rb') as image_file:
            content = image_file.read()

        image = types.Image(content=content)
        response = self.client.text_detection(image=image)
        texts = response.text_annotations

        if texts:
            return texts[0].description
        return ""

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """
        Extract text from PDF using OCR.

        Args:
            pdf_path: Path to PDF file

        Returns:
            Extracted text from all pages
        """
        from pdf2image import convert_from_path

        # Convert PDF to images
        images = convert_from_path(pdf_path)

        all_text = []
        for i, image in enumerate(images):
            # Convert PIL image to bytes
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='PNG')
            img_byte_arr = img_byte_arr.getvalue()

            # Perform OCR
            vision_image = types.Image(content=img_byte_arr)
            response = self.client.text_detection(image=vision_image)
            texts = response.text_annotations

            if texts:
                all_text.append(f"--- Page {i+1} ---\n{texts[0].description}")

        return "\n\n".join(all_text)

    def parse_price_list_from_text(self, text: str) -> List[Dict[str, any]]:
        """
        Parse price list from extracted text.

        This method uses heuristics to extract product names and prices.

        Args:
            text: Extracted text from OCR

        Returns:
            List of dictionaries containing product info
        """
        products = []
        lines = text.split('\n')

        # Common price patterns
        price_pattern = r'(\d{1,3}(?:[,\.]\d{3})*(?:[,\.]\d{2})?)\s*(?:đ|vnd|vnđ|đồng)?'

        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue

            # Try to find price in current line
            price_match = re.search(price_pattern, line, re.IGNORECASE)

            if price_match:
                price_str = price_match.group(1)
                # Normalize price (remove dots/commas)
                price_str = price_str.replace('.', '').replace(',', '')

                try:
                    price = float(price_str)

                    # Extract product name (text before price)
                    product_name = line[:price_match.start()].strip()

                    # Clean product name
                    product_name = re.sub(r'^\d+[\.\)]\s*', '', product_name)  # Remove numbering
                    product_name = re.sub(r'\s+', ' ', product_name)  # Normalize spaces

                    if product_name and len(product_name) > 2:
                        products.append({
                            'name': product_name,
                            'price': price,
                            'source_line': line
                        })
                except ValueError:
                    continue

        return products

    def parse_price_list_from_image(self, image_path: str) -> List[Dict[str, any]]:
        """
        Extract and parse price list from image.

        Args:
            image_path: Path to image file

        Returns:
            List of product dictionaries
        """
        text = self.extract_text_from_image(image_path)
        return self.parse_price_list_from_text(text)

    def parse_price_list_from_pdf(self, pdf_path: str) -> List[Dict[str, any]]:
        """
        Extract and parse price list from PDF.

        Args:
            pdf_path: Path to PDF file

        Returns:
            List of product dictionaries
        """
        text = self.extract_text_from_pdf(pdf_path)
        return self.parse_price_list_from_text(text)

    def parse_price_list_from_excel(self, excel_path: str,
                                     name_col: str = None,
                                     price_col: str = None) -> List[Dict[str, any]]:
        """
        Parse price list from Excel file.

        Args:
            excel_path: Path to Excel file
            name_col: Column name for product names (auto-detect if None)
            price_col: Column name for prices (auto-detect if None)

        Returns:
            List of product dictionaries
        """
        df = pd.read_excel(excel_path)

        # Auto-detect columns if not specified
        if name_col is None:
            # Look for columns with 'name', 'product', 'item' in header
            for col in df.columns:
                if any(keyword in col.lower() for keyword in ['name', 'product', 'item', 'tên', 'sản phẩm']):
                    name_col = col
                    break

        if price_col is None:
            # Look for columns with 'price', 'cost', 'giá' in header
            for col in df.columns:
                if any(keyword in col.lower() for keyword in ['price', 'cost', 'giá', 'gia']):
                    price_col = col
                    break

        if name_col is None or price_col is None:
            raise ValueError("Could not auto-detect name and price columns. Please specify manually.")

        products = []
        for _, row in df.iterrows():
            name = str(row[name_col]).strip()
            price = row[price_col]

            # Skip invalid rows
            if pd.isna(name) or pd.isna(price) or name == '' or name == 'nan':
                continue

            # Convert price to float
            if isinstance(price, str):
                price = price.replace(',', '').replace('.', '')
                try:
                    price = float(price)
                except ValueError:
                    continue

            products.append({
                'name': name,
                'price': float(price),
                'source': 'excel'
            })

        return products

    def parse_price_list_from_csv(self, csv_path: str,
                                    name_col: str = None,
                                    price_col: str = None) -> List[Dict[str, any]]:
        """
        Parse price list from CSV file.

        Args:
            csv_path: Path to CSV file
            name_col: Column name for product names (auto-detect if None)
            price_col: Column name for prices (auto-detect if None)

        Returns:
            List of product dictionaries
        """
        df = pd.read_csv(csv_path)

        # Use same logic as Excel parsing
        if name_col is None:
            for col in df.columns:
                if any(keyword in col.lower() for keyword in ['name', 'product', 'item', 'tên', 'sản phẩm']):
                    name_col = col
                    break

        if price_col is None:
            for col in df.columns:
                if any(keyword in col.lower() for keyword in ['price', 'cost', 'giá', 'gia']):
                    price_col = col
                    break

        if name_col is None or price_col is None:
            raise ValueError("Could not auto-detect name and price columns. Please specify manually.")

        products = []
        for _, row in df.iterrows():
            name = str(row[name_col]).strip()
            price = row[price_col]

            if pd.isna(name) or pd.isna(price) or name == '' or name == 'nan':
                continue

            if isinstance(price, str):
                price = price.replace(',', '').replace('.', '')
                try:
                    price = float(price)
                except ValueError:
                    continue

            products.append({
                'name': name,
                'price': float(price),
                'source': 'csv'
            })

        return products

    def auto_parse_price_list(self, file_path: str, **kwargs) -> List[Dict[str, any]]:
        """
        Automatically detect file type and parse price list.

        Args:
            file_path: Path to file (image, PDF, Excel, or CSV)
            **kwargs: Additional arguments for specific parsers

        Returns:
            List of product dictionaries
        """
        ext = os.path.splitext(file_path)[1].lower()

        if ext in ['.jpg', '.jpeg', '.png', '.bmp', '.gif']:
            return self.parse_price_list_from_image(file_path)
        elif ext == '.pdf':
            return self.parse_price_list_from_pdf(file_path)
        elif ext in ['.xlsx', '.xls']:
            return self.parse_price_list_from_excel(file_path, **kwargs)
        elif ext == '.csv':
            return self.parse_price_list_from_csv(file_path, **kwargs)
        else:
            raise ValueError(f"Unsupported file type: {ext}")
