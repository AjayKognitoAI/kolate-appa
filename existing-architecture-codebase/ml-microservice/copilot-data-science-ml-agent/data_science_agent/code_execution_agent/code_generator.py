"""
Code Generator Agent

Generates Python analysis code based on user query and file metadata.
"""
import json
from pathlib import Path
from typing import Dict, List, Any
import google.generativeai as genai

from .config import get_config

config = get_config()


class CodeGenerator:
    """
    Agent that generates Python code for data analysis.
    """

    def __init__(self, model_name: str = None):
        """
        Initialize code generator agent.

        Args:
            model_name: Google Gemini model name (default from config)
        """
        self.model_name = model_name or config.model_name
        self.model = genai.GenerativeModel(self.model_name)

        # Load prompt
        prompt_file = Path(__file__).parent / "prompts" / "code_generator.txt"
        with open(prompt_file, 'r') as f:
            self.system_prompt = f.read()

    def generate_code(
        self,
        query: str,
        files: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate Python code to answer user query.

        Args:
            query: User query/question
            files: List of file dictionaries with metadata

        Returns:
            Dictionary with:
            - code: Generated Python code
            - explanation: What the code does
            - variable_mapping: Dict mapping variable names (df1, df2) to file paths
            - estimated_runtime: Rough estimate of execution time
        """
        if not files:
            return {
                'code': 'result = "No files provided for analysis"',
                'explanation': 'No files to analyze',
                'variable_mapping': {},
                'estimated_runtime': 'instant',
            }

        # Build variable mapping (df1, df2, df3, ...)
        variable_mapping = {}
        for i, file_info in enumerate(files):
            var_name = f"df{i+1}" if len(files) > 1 else "df"
            variable_mapping[var_name] = file_info['file_path']

        # Build prompt
        prompt = self._build_code_generation_prompt(query, files, variable_mapping)

        # Call LLM
        try:
            response = self.model.generate_content(prompt)
            code_result = self._parse_code_response(response.text)

            return {
                'code': code_result['code'],
                'explanation': code_result.get('explanation', 'Code generated to answer query'),
                'variable_mapping': variable_mapping,
                'estimated_runtime': self._estimate_runtime(files),
            }

        except Exception as e:
            print(f"Error generating code: {e}")
            # Fallback: simple describe
            fallback_code = self._generate_fallback_code(variable_mapping)
            return {
                'code': fallback_code,
                'explanation': f'Fallback code due to error: {e}',
                'variable_mapping': variable_mapping,
                'estimated_runtime': 'unknown',
            }

    def _build_code_generation_prompt(
        self,
        query: str,
        files: List[Dict[str, Any]],
        variable_mapping: Dict[str, str]
    ) -> str:
        """Build prompt for code generation."""
        # Prepare file information
        files_info = []
        for var_name, file_path in variable_mapping.items():
            # Find corresponding file metadata
            file_data = next((f for f in files if f['file_path'] == file_path), None)
            if file_data:
                metadata = file_data.get('metadata', {})
                info = {
                    'variable': var_name,
                    'file_name': file_data['file_name'],
                    'columns': metadata.get('column_names', []),
                    'column_types': metadata.get('column_types', {}),
                    'num_rows': metadata.get('num_rows'),
                    'sample_data': metadata.get('sample_data', [])[:5],
                }
                files_info.append(info)

        prompt = f"""{self.system_prompt}

USER QUERY:
{query}

AVAILABLE DATA:
{json.dumps(files_info, indent=2)}

VARIABLE NAMES:
{json.dumps(variable_mapping, indent=2)}

INSTRUCTIONS:
1. Write Python code to answer the user's query
2. DataFrames are already loaded with the variable names above
3. Store your final answer in a variable called 'result'
4. Create visualizations if they help answer the question
5. Print intermediate findings for context
6. Handle missing/invalid data gracefully

Please generate the Python code now. Return ONLY the code in a Python code block.
"""
        return prompt

    def _parse_code_response(self, response_text: str) -> Dict[str, Any]:
        """Parse LLM response to extract code."""
        code = ""
        explanation = ""

        try:
            # Extract code from markdown code block
            if '```python' in response_text:
                code_start = response_text.find('```python') + 9
                code_end = response_text.find('```', code_start)
                code = response_text[code_start:code_end].strip()

                # Explanation might be before or after code block
                explanation = response_text[:response_text.find('```python')].strip()
                if not explanation:
                    explanation = response_text[code_end+3:].strip()

            elif '```' in response_text:
                code_start = response_text.find('```') + 3
                code_end = response_text.find('```', code_start)
                code = response_text[code_start:code_end].strip()

                explanation = response_text[:response_text.find('```')].strip()
                if not explanation:
                    explanation = response_text[code_end+3:].strip()
            else:
                # No code block, assume entire response is code
                code = response_text.strip()

            # Ensure code assigns to 'result' variable
            if 'result' not in code:
                code += "\n\n# Store result\nresult = 'Analysis complete'"

            return {
                'code': code,
                'explanation': explanation or 'Code generated successfully',
            }

        except Exception as e:
            print(f"Error parsing code response: {e}")
            return {
                'code': 'result = "Error parsing generated code"',
                'explanation': f'Error: {e}',
            }

    def _generate_fallback_code(self, variable_mapping: Dict[str, str]) -> str:
        """Generate simple fallback code."""
        var_name = list(variable_mapping.keys())[0] if variable_mapping else "df"

        code = f"""# Fallback analysis
print("Dataset shape:", {var_name}.shape)
print("\\nColumn names:", list({var_name}.columns))
print("\\nFirst few rows:")
print({var_name}.head())

print("\\nBasic statistics:")
print({var_name}.describe())

result = {{
    'shape': {var_name}.shape,
    'columns': list({var_name}.columns),
    'summary': {var_name}.describe().to_dict()
}}
"""
        return code

    def _estimate_runtime(self, files: List[Dict[str, Any]]) -> str:
        """Estimate code execution time based on file sizes."""
        total_size = sum(f.get('file_size_mb', 0) for f in files)

        if total_size < 10:
            return '< 5 seconds'
        elif total_size < 50:
            return '5-15 seconds'
        elif total_size < 200:
            return '15-60 seconds'
        else:
            return '1-5 minutes'
