"""
Response Formatter Agent

Formats code execution results into user-friendly responses.
"""
import json
from pathlib import Path
from typing import Dict, Any
import google.generativeai as genai

from .config import get_config

config = get_config()


class ResponseFormatter:
    """
    Agent that formats execution results into clear responses.
    """

    def __init__(self, model_name: str = None):
        """
        Initialize response formatter agent.

        Args:
            model_name: Google Gemini model name (default from config)
        """
        self.model_name = model_name or config.model_name
        self.model = genai.GenerativeModel(self.model_name)

        # Load prompt
        prompt_file = Path(__file__).parent / "prompts" / "response_formatter.txt"
        with open(prompt_file, 'r') as f:
            self.system_prompt = f.read()

    def format_response(
        self,
        query: str,
        execution_result: Dict[str, Any],
        files_used: list[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Format execution results into user-friendly response.

        Args:
            query: Original user query
            execution_result: Results from code execution
            files_used: List of files used in analysis

        Returns:
            Dictionary with:
            - response: Formatted response text (markdown)
            - success: Whether execution was successful
            - plots: List of plot file paths
            - raw_result: Original result (for debugging)
        """
        # Build prompt
        prompt = self._build_formatting_prompt(query, execution_result, files_used)

        # Call LLM
        try:
            response = self.model.generate_content(prompt)
            formatted_text = response.text

            return {
                'response': formatted_text,
                'success': execution_result.get('success', False),
                'plots': execution_result.get('plots', []),
                'raw_result': execution_result.get('result'),
            }

        except Exception as e:
            print(f"Error formatting response: {e}")
            # Fallback: simple formatting
            fallback = self._create_fallback_response(query, execution_result, files_used)
            return fallback

    def _build_formatting_prompt(
        self,
        query: str,
        execution_result: Dict[str, Any],
        files_used: list[Dict[str, Any]]
    ) -> str:
        """Build prompt for response formatting."""
        # Prepare execution summary
        exec_summary = {
            'success': execution_result.get('success'),
            'output': execution_result.get('output', ''),
            'result': self._serialize_for_llm(execution_result.get('result')),
            'error': execution_result.get('error'),
            'plots_generated': len(execution_result.get('plots', [])),
        }

        # Prepare file info
        files_summary = []
        for file_info in files_used:
            files_summary.append({
                'file_name': file_info['file_name'],
                'num_rows': file_info.get('metadata', {}).get('num_rows'),
                'num_columns': file_info.get('metadata', {}).get('num_columns'),
            })

        prompt = f"""{self.system_prompt}

USER QUERY:
{query}

EXECUTION RESULTS:
{json.dumps(exec_summary, indent=2)}

FILES USED:
{json.dumps(files_summary, indent=2)}

Please format a clear, comprehensive response that answers the user's query based on these execution results.
"""
        return prompt

    def _serialize_for_llm(self, result: Any) -> Any:
        """Serialize result for LLM prompt (limit size)."""
        if result is None:
            return None

        if isinstance(result, dict):
            # Limit dictionary size
            if len(str(result)) > 5000:
                return {k: str(v)[:200] for k, v in list(result.items())[:10]}
            return result

        if isinstance(result, list):
            # Limit list size
            if len(result) > 100:
                return result[:100] + ['... (truncated)']
            return result

        if isinstance(result, str):
            # Limit string length
            if len(result) > 2000:
                return result[:2000] + '... (truncated)'
            return result

        # Convert to string for other types
        result_str = str(result)
        if len(result_str) > 2000:
            return result_str[:2000] + '... (truncated)'
        return result_str

    def _create_fallback_response(
        self,
        query: str,
        execution_result: Dict[str, Any],
        files_used: list[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Create simple fallback response."""
        if not execution_result.get('success'):
            error = execution_result.get('error', 'Unknown error')
            response = f"""## Analysis Error

Unfortunately, the analysis encountered an error:

```
{error}
```

Please try rephrasing your query or check if the data files are valid.
"""
            return {
                'response': response,
                'success': False,
                'plots': [],
                'raw_result': None,
            }

        # Success case
        output = execution_result.get('output', 'No output')
        result = execution_result.get('result')
        plots = execution_result.get('plots', [])

        response = f"""## Analysis Results

Your query: "{query}"

### Output
```
{output[:1000]}
```

### Result
```
{str(result)[:1000] if result else 'No result variable set'}
```

### Visualizations
{len(plots)} plot(s) generated.

### Data Used
"""
        for file_info in files_used:
            response += f"- {file_info['file_name']}\n"

        return {
            'response': response,
            'success': True,
            'plots': plots,
            'raw_result': result,
        }
