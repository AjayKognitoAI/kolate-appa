"""File handling utilities for various file types."""

import os
import shutil
from typing import Dict, Any, Optional, List
import PyPDF2
import pdfplumber


class FileHandler:
    """Handles file operations and parsing."""

    def __init__(self, upload_dir: str = "./data/uploads"):
        """
        Initialize file handler.

        Args:
            upload_dir: Directory for uploaded files
        """
        self.upload_dir = upload_dir
        os.makedirs(upload_dir, exist_ok=True)

    def save_uploaded_file(self, file_content: bytes, filename: str) -> str:
        """
        Save uploaded file to disk.

        Args:
            file_content: File content as bytes
            filename: Original filename

        Returns:
            Path to saved file
        """
        # Sanitize filename
        safe_filename = self._sanitize_filename(filename)
        filepath = os.path.join(self.upload_dir, safe_filename)

        # Handle duplicate filenames
        if os.path.exists(filepath):
            base, ext = os.path.splitext(safe_filename)
            counter = 1
            while os.path.exists(filepath):
                safe_filename = f"{base}_{counter}{ext}"
                filepath = os.path.join(self.upload_dir, safe_filename)
                counter += 1

        with open(filepath, 'wb') as f:
            f.write(file_content)

        return filepath

    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent security issues."""
        # Remove path components
        filename = os.path.basename(filename)
        # Remove potentially dangerous characters
        keepcharacters = ('.', '_', '-')
        return "".join(c for c in filename if c.isalnum() or c in keepcharacters).rstrip()

    def get_file_type(self, filename: str) -> str:
        """Get file type from extension."""
        ext = os.path.splitext(filename)[1].lower()
        type_mapping = {
            '.csv': 'csv',
            '.xlsx': 'excel',
            '.xls': 'excel',
            '.pdf': 'pdf',
            '.txt': 'text',
            '.json': 'json',
            '.xml': 'xml',
        }
        return type_mapping.get(ext, 'unknown')

    def extract_pdf_text(self, pdf_path: str) -> Dict[str, Any]:
        """
        Extract text from PDF file.

        Args:
            pdf_path: Path to PDF file

        Returns:
            Dictionary with extracted text and metadata
        """
        text_content = []
        metadata = {}

        try:
            # Try pdfplumber first (better for complex PDFs)
            with pdfplumber.open(pdf_path) as pdf:
                metadata = {
                    'num_pages': len(pdf.pages),
                    'metadata': pdf.metadata,
                }

                for i, page in enumerate(pdf.pages):
                    text = page.extract_text()
                    if text:
                        text_content.append({
                            'page': i + 1,
                            'text': text,
                            'char_count': len(text),
                        })

        except Exception as e:
            # Fallback to PyPDF2
            try:
                with open(pdf_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    metadata = {
                        'num_pages': len(pdf_reader.pages),
                        'metadata': pdf_reader.metadata,
                    }

                    for i, page in enumerate(pdf_reader.pages):
                        text = page.extract_text()
                        if text:
                            text_content.append({
                                'page': i + 1,
                                'text': text,
                                'char_count': len(text),
                            })

            except Exception as e2:
                return {
                    'error': f"Failed to extract PDF: {str(e)}, {str(e2)}",
                    'text_content': [],
                    'metadata': {},
                }

        return {
            'text_content': text_content,
            'metadata': metadata,
            'total_chars': sum(page['char_count'] for page in text_content),
            'full_text': '\n\n'.join(page['text'] for page in text_content),
        }

    def parse_research_paper(self, pdf_path: str) -> Dict[str, Any]:
        """
        Parse research paper and extract structured information.

        Args:
            pdf_path: Path to research paper PDF

        Returns:
            Dictionary with structured paper information
        """
        extraction = self.extract_pdf_text(pdf_path)

        if 'error' in extraction:
            return extraction

        full_text = extraction['full_text']

        # Simple heuristics to extract sections
        # This is a basic implementation - can be improved with NLP
        sections = {}

        common_sections = [
            'abstract', 'introduction', 'methods', 'methodology',
            'results', 'discussion', 'conclusion', 'references'
        ]

        # Try to identify sections
        text_lower = full_text.lower()
        for section in common_sections:
            if section in text_lower:
                sections[section] = True

        return {
            'filename': os.path.basename(pdf_path),
            'num_pages': extraction['metadata'].get('num_pages', 0),
            'total_chars': extraction['total_chars'],
            'has_sections': sections,
            'full_text': full_text,
            'pages': extraction['text_content'],
            'metadata': extraction['metadata'],
        }

    def cleanup_old_files(self, days: int = 7) -> int:
        """
        Clean up files older than specified days.

        Args:
            days: Number of days

        Returns:
            Number of files deleted
        """
        import time

        current_time = time.time()
        cutoff_time = current_time - (days * 86400)  # 86400 seconds in a day
        deleted_count = 0

        for filename in os.listdir(self.upload_dir):
            filepath = os.path.join(self.upload_dir, filename)
            if os.path.isfile(filepath):
                file_time = os.path.getmtime(filepath)
                if file_time < cutoff_time:
                    os.remove(filepath)
                    deleted_count += 1

        return deleted_count

    def list_session_files(self, session_id: str) -> List[Dict[str, Any]]:
        """
        List all files for a session.

        Args:
            session_id: Session ID

        Returns:
            List of file information dictionaries
        """
        files = []
        session_prefix = f"{session_id}_"

        for filename in os.listdir(self.upload_dir):
            if filename.startswith(session_prefix):
                filepath = os.path.join(self.upload_dir, filename)
                if os.path.isfile(filepath):
                    file_stats = os.stat(filepath)
                    files.append({
                        'filename': filename,
                        'filepath': filepath,
                        'size_bytes': file_stats.st_size,
                        'modified_time': file_stats.st_mtime,
                        'file_type': self.get_file_type(filename),
                    })

        return files
