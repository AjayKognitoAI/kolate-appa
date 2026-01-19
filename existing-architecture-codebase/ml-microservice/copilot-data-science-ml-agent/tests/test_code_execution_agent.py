"""
Tests for Code Execution Agent

Run with: poetry run pytest tests/test_code_execution_agent.py -v
"""
import os
import sys
import pytest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))


class TestCodeExecutor:
    """Tests for CodeExecutor component."""

    def test_code_safety_check_valid(self):
        """Test that valid code passes safety check."""
        from data_science_agent.code_execution_agent.code_executor import CodeExecutor

        executor = CodeExecutor()

        valid_code = """
import pandas as pd
import numpy as np

df['new_col'] = df['col1'] + df['col2']
result = df.describe()
"""
        result = executor._check_code_safety(valid_code)
        assert result['safe'] is True

    def test_code_safety_check_disallowed_import(self):
        """Test that disallowed imports are caught."""
        from data_science_agent.code_execution_agent.code_executor import CodeExecutor

        executor = CodeExecutor()

        bad_code = """
import subprocess
subprocess.run(['ls'])
"""
        result = executor._check_code_safety(bad_code)
        assert result['safe'] is False
        assert 'subprocess' in result['reason']

    def test_code_safety_check_disallowed_pattern(self):
        """Test that dangerous patterns are caught."""
        from data_science_agent.code_execution_agent.code_executor import CodeExecutor

        executor = CodeExecutor()

        bad_code = """
exec('print("hello")')
"""
        result = executor._check_code_safety(bad_code)
        assert result['safe'] is False
        assert 'exec' in result['reason'].lower()

    def test_code_execution_simple(self):
        """Test simple code execution."""
        from data_science_agent.code_execution_agent.code_executor import CodeExecutor

        executor = CodeExecutor()

        code = """
x = 1 + 1
print(f"Result: {x}")
result = x
"""
        result = executor.execute(code, file_paths={})

        assert result['success'] is True
        assert result['result'] == 2
        assert 'Result: 2' in result['output']

    def test_code_execution_with_dataframe(self, tmp_path):
        """Test code execution with CSV file."""
        from data_science_agent.code_execution_agent.code_executor import CodeExecutor
        import pandas as pd

        # Create test CSV
        test_csv = tmp_path / "test.csv"
        df = pd.DataFrame({'a': [1, 2, 3], 'b': [4, 5, 6]})
        df.to_csv(test_csv, index=False)

        executor = CodeExecutor()

        code = """
print(f"Shape: {df.shape}")
result = {'rows': len(df), 'cols': len(df.columns)}
"""
        result = executor.execute(
            code=code,
            file_paths={'df': str(test_csv)}
        )

        assert result['success'] is True
        assert result['result']['rows'] == 3
        assert result['result']['cols'] == 2

    def test_code_execution_error_handling(self):
        """Test that errors are caught properly."""
        from data_science_agent.code_execution_agent.code_executor import CodeExecutor

        executor = CodeExecutor()

        bad_code = """
x = 1 / 0  # Division by zero
result = x
"""
        result = executor.execute(bad_code, file_paths={})

        assert result['success'] is False
        assert 'ZeroDivisionError' in result['error']


class TestFileTools:
    """Tests for file tools."""

    def test_list_local_files(self, tmp_path):
        """Test listing local files."""
        from data_science_agent.code_execution_agent.tools.file_tools import _list_local_files

        # This test would need proper setup with uploads directory
        # For now just test it doesn't crash
        result = _list_local_files()
        assert isinstance(result, list)

    def test_get_file_metadata(self, tmp_path):
        """Test getting file metadata."""
        from data_science_agent.code_execution_agent.tools.file_tools import get_file_metadata
        import pandas as pd

        # Create test CSV
        test_csv = tmp_path / "test_metadata.csv"
        df = pd.DataFrame({
            'name': ['Alice', 'Bob', 'Charlie'],
            'age': [25, 30, 35],
            'score': [85.5, 90.0, 78.5]
        })
        df.to_csv(test_csv, index=False)

        metadata = get_file_metadata(str(test_csv))

        assert metadata['file_name'] == 'test_metadata.csv'
        assert metadata['num_rows'] == 3
        assert metadata['num_columns'] == 3
        assert 'name' in metadata['column_names']
        assert 'age' in metadata['column_names']
        assert len(metadata['sample_data']) <= 5


class TestConfig:
    """Tests for configuration."""

    def test_config_defaults(self):
        """Test that config has sensible defaults."""
        from data_science_agent.code_execution_agent.config import CodeExecutionConfig

        config = CodeExecutionConfig()

        assert config.model_name == "gemini-2.0-flash-exp"
        assert config.temperature >= 0
        assert config.max_tokens > 0
        assert config.execution_timeout > 0
        assert len(config.allowed_imports) > 0
        assert len(config.disallowed_code_patterns) > 0

    def test_config_allowed_imports(self):
        """Test that essential packages are in allowed imports."""
        from data_science_agent.code_execution_agent.config import CodeExecutionConfig

        config = CodeExecutionConfig()
        allowed = config.allowed_imports

        assert 'pandas' in allowed
        assert 'numpy' in allowed
        assert 'matplotlib' in allowed
        assert 'seaborn' in allowed
        assert 'sklearn' in allowed

    def test_config_disallowed_patterns(self):
        """Test that dangerous patterns are blocked."""
        from data_science_agent.code_execution_agent.config import CodeExecutionConfig

        config = CodeExecutionConfig()
        blocked = config.disallowed_code_patterns

        assert 'exec(' in blocked
        assert 'eval(' in blocked
        assert 'subprocess' in blocked


class TestIntegration:
    """Integration tests (require API key)."""

    @pytest.fixture
    def orchestrator(self):
        """Create orchestrator if API key available."""
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            pytest.skip("GOOGLE_API_KEY not set")

        from data_science_agent.code_execution_agent import CodeExecutionOrchestrator
        return CodeExecutionOrchestrator(api_key=api_key)

    @pytest.mark.integration
    def test_orchestrator_initialization(self, orchestrator):
        """Test orchestrator initializes correctly."""
        assert orchestrator.file_selector is not None
        assert orchestrator.code_generator is not None
        assert orchestrator.code_executor is not None
        assert orchestrator.response_formatter is not None

    @pytest.mark.integration
    def test_get_available_files(self, orchestrator):
        """Test listing available files."""
        result = orchestrator.get_available_files()

        assert 'files' in result
        assert 'count' in result
        assert isinstance(result['files'], list)

    @pytest.mark.integration
    @pytest.mark.slow
    def test_simple_query(self, orchestrator, tmp_path):
        """Test processing a simple query."""
        import pandas as pd

        # Create test data
        upload_dir = Path("./data/uploads")
        upload_dir.mkdir(parents=True, exist_ok=True)

        test_csv = upload_dir / "test_integration.csv"
        df = pd.DataFrame({
            'x': [1, 2, 3, 4, 5],
            'y': [2, 4, 5, 4, 5]
        })
        df.to_csv(test_csv, index=False)

        try:
            result = orchestrator.process_query(
                query="What is the correlation between x and y?"
            )

            assert 'response' in result
            assert 'success' in result
            assert 'metadata' in result

        finally:
            # Cleanup
            if test_csv.exists():
                test_csv.unlink()


# ============================================================================
# Run tests
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "not integration"])
