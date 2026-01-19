"""
File Selector Agent

Selects relevant files from available data sources based on user query.
"""
import json
from pathlib import Path
from typing import Dict, List, Any
import google.generativeai as genai

from .config import get_config
from .tools.file_tools import list_available_files, get_file_metadata

config = get_config()


class FileSelector:
    """
    Agent that selects relevant files for analysis based on user query.
    """

    def __init__(self, model_name: str = None):
        """
        Initialize file selector agent.

        Args:
            model_name: Google Gemini model name (default from config)
        """
        self.model_name = model_name or config.model_name
        self.model = genai.GenerativeModel(self.model_name)

        # Load prompt
        prompt_file = Path(__file__).parent / "prompts" / "file_selector.txt"
        with open(prompt_file, 'r') as f:
            self.system_prompt = f.read()

    def select_files(
        self,
        query: str,
        trial_name: str = None,
        max_files: int = None
    ) -> Dict[str, Any]:
        """
        Select relevant files for a given query.

        Args:
            query: User query/question
            trial_name: Optional trial name to filter files
            max_files: Maximum files to select (default from config)

        Returns:
            Dictionary with:
            - selected_files: List of dicts with file_path, reason, metadata
            - file_count: Number of files selected
            - total_size_mb: Total size of selected files
            - reasoning: Explanation of selection process
        """
        max_files = max_files or config.max_files_to_select

        # Get available files
        available_files = list_available_files(trial_name=trial_name)

        if not available_files:
            return {
                'selected_files': [],
                'file_count': 0,
                'total_size_mb': 0,
                'reasoning': 'No files available',
            }

        # Get metadata for files (column names, types, samples)
        files_with_metadata = []
        for file_info in available_files[:50]:  # Limit to 50 files for performance
            metadata = get_file_metadata(file_info['file_path'])
            file_info['metadata'] = metadata
            files_with_metadata.append(file_info)

        # Build prompt for LLM
        prompt = self._build_selection_prompt(query, files_with_metadata, max_files)

        # Call LLM
        try:
            response = self.model.generate_content(prompt)
            selection_result = self._parse_selection_response(response.text)

            # Validate and enrich selection with full metadata
            enriched_selection = self._enrich_selection(
                selection_result,
                files_with_metadata
            )

            return enriched_selection

        except Exception as e:
            print(f"Error in file selection: {e}")
            # Fallback: select first file
            if files_with_metadata:
                return {
                    'selected_files': [{
                        'file_path': files_with_metadata[0]['file_path'],
                        'reason': 'Fallback selection due to error',
                        'metadata': files_with_metadata[0].get('metadata', {}),
                    }],
                    'file_count': 1,
                    'total_size_mb': files_with_metadata[0].get('file_size', 0) / (1024 * 1024),
                    'reasoning': f'Error during selection: {e}',
                }
            else:
                return {
                    'selected_files': [],
                    'file_count': 0,
                    'total_size_mb': 0,
                    'reasoning': f'Error during selection: {e}',
                }

    def _build_selection_prompt(
        self,
        query: str,
        files: List[Dict[str, Any]],
        max_files: int
    ) -> str:
        """Build prompt for file selection."""
        files_summary = []
        for i, file_info in enumerate(files):
            metadata = file_info.get('metadata', {})
            summary = {
                'index': i,
                'file_path': file_info['file_path'],
                'file_name': file_info['file_name'],
                'file_size_mb': round(file_info['file_size'] / (1024 * 1024), 2),
                'trial_name': file_info.get('trial_name'),
                'columns': metadata.get('column_names', []),
                'num_rows': metadata.get('num_rows'),
                'sample': metadata.get('sample_data', [])[:3] if metadata.get('sample_data') else [],
            }
            files_summary.append(summary)

        prompt = f"""{self.system_prompt}

USER QUERY:
{query}

AVAILABLE FILES ({len(files)} total):
{json.dumps(files_summary, indent=2)}

CONSTRAINTS:
- Maximum files to select: {max_files}
- Prioritize files that directly answer the query
- Consider file sizes (avoid very large files unless necessary)

Please select the most relevant files and provide your selection in the JSON format specified.
"""
        return prompt

    def _parse_selection_response(self, response_text: str) -> Dict[str, Any]:
        """Parse LLM response to extract file selection."""
        # Try to extract JSON from response
        try:
            # Look for JSON block
            if '```json' in response_text:
                json_start = response_text.find('```json') + 7
                json_end = response_text.find('```', json_start)
                json_text = response_text[json_start:json_end].strip()
            elif '```' in response_text:
                json_start = response_text.find('```') + 3
                json_end = response_text.find('```', json_start)
                json_text = response_text[json_start:json_end].strip()
            else:
                # Try to find JSON object
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1
                json_text = response_text[json_start:json_end].strip()

            result = json.loads(json_text)
            return result

        except Exception as e:
            print(f"Error parsing selection response: {e}")
            print(f"Response text: {response_text}")
            return {
                'selected_files': [],
                'file_count': 0,
                'total_size_mb': 0,
            }

    def _enrich_selection(
        self,
        selection: Dict[str, Any],
        available_files: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Enrich selection with full metadata."""
        # Build lookup by file_path
        file_lookup = {f['file_path']: f for f in available_files}

        enriched_files = []
        total_size = 0

        for selected in selection.get('selected_files', []):
            file_path = selected['file_path']
            if file_path in file_lookup:
                file_info = file_lookup[file_path]
                enriched_files.append({
                    'file_path': file_path,
                    'file_name': file_info['file_name'],
                    'reason': selected.get('reason', 'Selected'),
                    'metadata': file_info.get('metadata', {}),
                    'file_size_mb': file_info['file_size'] / (1024 * 1024),
                })
                total_size += file_info['file_size']

        return {
            'selected_files': enriched_files,
            'file_count': len(enriched_files),
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'reasoning': selection.get('reasoning', 'Files selected based on query relevance'),
        }
