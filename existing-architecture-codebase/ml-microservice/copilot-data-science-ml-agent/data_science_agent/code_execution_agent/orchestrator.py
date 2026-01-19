"""
Code Execution Orchestrator

Main orchestrator that coordinates the file selection, code generation,
execution, and response formatting workflow.
"""
import time
from typing import Dict, Any, Optional
import google.generativeai as genai

from .config import get_config
from .file_selector import FileSelector
from .code_generator import CodeGenerator
from .code_executor import CodeExecutor
from .response_formatter import ResponseFormatter

config = get_config()


class CodeExecutionOrchestrator:
    """
    Main orchestrator for code execution-based data analysis.

    Workflow:
    1. User query → FileSelector selects relevant files
    2. File metadata + query → CodeGenerator generates Python code
    3. Code → CodeExecutor runs locally and returns results
    4. Results → ResponseFormatter creates user-friendly response
    """

    def __init__(self, api_key: str = None):
        """
        Initialize orchestrator with Google Gemini API.

        Args:
            api_key: Google API key (uses GOOGLE_API_KEY env var if not provided)
        """
        # Configure Google Generative AI
        if api_key:
            genai.configure(api_key=api_key)
        else:
            # Will use GOOGLE_API_KEY environment variable
            genai.configure()

        # Initialize agents
        self.file_selector = FileSelector()
        self.code_generator = CodeGenerator()
        self.code_executor = CodeExecutor()
        self.response_formatter = ResponseFormatter()

        self.config = config

    def process_query(
        self,
        query: str,
        trial_name: Optional[str] = None,
        session_id: Optional[str] = None,
        max_files: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Process a user query end-to-end.

        Args:
            query: User question/query
            trial_name: Optional trial name to filter files
            session_id: Optional session ID for tracking
            max_files: Maximum files to select

        Returns:
            Dictionary with:
            - response: Formatted response text (markdown)
            - success: Whether analysis succeeded
            - plots: List of plot file paths
            - metadata: Debug info (selected files, code, execution time, etc.)
        """
        start_time = time.time()
        metadata = {
            'query': query,
            'trial_name': trial_name,
            'session_id': session_id,
            'workflow': [],
        }

        try:
            # Step 1: Select relevant files
            print("\n[1/4] Selecting relevant files...")
            selection_result = self.file_selector.select_files(
                query=query,
                trial_name=trial_name,
                max_files=max_files
            )
            metadata['workflow'].append({
                'step': 'file_selection',
                'files_selected': selection_result['file_count'],
                'total_size_mb': selection_result['total_size_mb'],
                'reasoning': selection_result['reasoning'],
            })
            print(f"   → Selected {selection_result['file_count']} file(s)")

            if not selection_result['selected_files']:
                return {
                    'response': "No relevant files found for your query. Please check if data files are available.",
                    'success': False,
                    'plots': [],
                    'metadata': metadata,
                }

            # Step 2: Generate analysis code
            print("\n[2/4] Generating analysis code...")
            code_result = self.code_generator.generate_code(
                query=query,
                files=selection_result['selected_files']
            )
            metadata['workflow'].append({
                'step': 'code_generation',
                'code_lines': len(code_result['code'].split('\n')),
                'explanation': code_result['explanation'],
                'estimated_runtime': code_result['estimated_runtime'],
            })
            metadata['generated_code'] = code_result['code']
            print(f"   → Generated {len(code_result['code'].split('\\n'))} lines of code")

            # Step 3: Execute code locally
            print(f"\n[3/4] Executing code locally (est. {code_result['estimated_runtime']})...")
            execution_result = self.code_executor.execute(
                code=code_result['code'],
                file_paths=code_result['variable_mapping'],
                context={'query': query}
            )
            metadata['workflow'].append({
                'step': 'code_execution',
                'success': execution_result['success'],
                'plots_generated': len(execution_result['plots']),
                'error': execution_result.get('error'),
            })
            print(f"   → Execution {'succeeded' if execution_result['success'] else 'failed'}")
            if execution_result['plots']:
                print(f"   → Generated {len(execution_result['plots'])} plot(s)")

            # Step 4: Format response
            print("\n[4/4] Formatting response...")
            response_result = self.response_formatter.format_response(
                query=query,
                execution_result=execution_result,
                files_used=selection_result['selected_files']
            )
            metadata['workflow'].append({
                'step': 'response_formatting',
                'success': True,
            })

            # Add timing
            total_time = time.time() - start_time
            metadata['total_time_seconds'] = round(total_time, 2)
            print(f"\n✓ Complete in {total_time:.2f}s")

            return {
                'response': response_result['response'],
                'success': response_result['success'],
                'plots': response_result['plots'],
                'metadata': metadata,
            }

        except Exception as e:
            print(f"\n✗ Error: {e}")
            metadata['error'] = str(e)
            metadata['total_time_seconds'] = round(time.time() - start_time, 2)

            return {
                'response': f"An error occurred during analysis: {str(e)}",
                'success': False,
                'plots': [],
                'metadata': metadata,
            }

    def process_query_with_custom_code(
        self,
        code: str,
        file_paths: Dict[str, str],
        query: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute custom user-provided code (advanced usage).

        Args:
            code: Python code to execute
            file_paths: Dict mapping variable names to file paths
            query: Optional original query for context

        Returns:
            Dictionary with response, success, plots, metadata
        """
        start_time = time.time()

        print("\n[1/2] Executing custom code...")
        execution_result = self.code_executor.execute(
            code=code,
            file_paths=file_paths,
            context={'query': query} if query else None
        )

        print(f"   → Execution {'succeeded' if execution_result['success'] else 'failed'}")

        if query:
            print("\n[2/2] Formatting response...")
            # Build file info from paths
            files_info = [
                {'file_name': path.split('/')[-1], 'metadata': {}}
                for path in file_paths.values()
            ]
            response_result = self.response_formatter.format_response(
                query=query,
                execution_result=execution_result,
                files_used=files_info
            )
            response = response_result['response']
        else:
            # No query, just return raw results
            response = execution_result['output']

        total_time = time.time() - start_time
        print(f"\n✓ Complete in {total_time:.2f}s")

        return {
            'response': response,
            'success': execution_result['success'],
            'plots': execution_result['plots'],
            'metadata': {
                'custom_code': True,
                'code_lines': len(code.split('\n')),
                'total_time_seconds': round(total_time, 2),
            }
        }

    def get_available_files(self, trial_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Get list of available files for analysis.

        Args:
            trial_name: Optional trial name filter

        Returns:
            Dictionary with list of files and metadata
        """
        from .tools.file_tools import list_available_files

        files = list_available_files(trial_name=trial_name)

        return {
            'files': files,
            'count': len(files),
            'total_size_mb': round(sum(f['file_size'] for f in files) / (1024 * 1024), 2),
            'sources': list(set(f['source'] for f in files)),
        }

    def get_file_info(self, file_path: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific file.

        Args:
            file_path: S3 URI or local path

        Returns:
            File metadata dictionary
        """
        from .tools.file_tools import get_file_metadata

        return get_file_metadata(file_path)
