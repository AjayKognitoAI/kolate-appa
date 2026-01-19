"""
Google ADK-style Agent Implementation

This module provides a Google ADK-compatible agent interface that wraps
the code execution functionality as ADK tools/functions.

Use this when you want to integrate with Google's Agent Development Kit
or use function calling patterns.
"""
import json
from typing import Dict, Any, List, Optional, Callable
import google.generativeai as genai

from .config import get_config
from .tools.file_tools import (
    list_available_files,
    get_file_metadata,
    download_file_from_s3,
    get_file_sample
)
from .code_executor import CodeExecutor

config = get_config()


# ============================================================================
# Tool Definitions (ADK Function Declarations)
# ============================================================================

LIST_FILES_TOOL = {
    "name": "list_files",
    "description": "List all available CSV and Excel files for analysis from S3 and local storage",
    "parameters": {
        "type": "object",
        "properties": {
            "trial_name": {
                "type": "string",
                "description": "Optional: Filter files by trial name"
            },
            "file_pattern": {
                "type": "string",
                "description": "Optional: Filter files by pattern (e.g., '*.csv')"
            }
        },
        "required": []
    }
}

GET_FILE_INFO_TOOL = {
    "name": "get_file_info",
    "description": "Get detailed metadata about a specific file including columns, types, and sample data",
    "parameters": {
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": "S3 URI (s3://bucket/key) or local file path"
            }
        },
        "required": ["file_path"]
    }
}

EXECUTE_ANALYSIS_TOOL = {
    "name": "execute_analysis",
    "description": "Execute Python code to analyze data files. Use pandas, numpy, matplotlib, seaborn, scipy, sklearn.",
    "parameters": {
        "type": "object",
        "properties": {
            "code": {
                "type": "string",
                "description": "Python code to execute. DataFrames will be loaded based on file_mapping. Store final result in 'result' variable."
            },
            "file_mapping": {
                "type": "object",
                "description": "Dictionary mapping variable names to file paths, e.g., {'df1': 's3://bucket/file.csv'}"
            }
        },
        "required": ["code", "file_mapping"]
    }
}

GET_FILE_SAMPLE_TOOL = {
    "name": "get_file_sample",
    "description": "Get a sample of rows from a data file to understand its content",
    "parameters": {
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": "S3 URI or local file path"
            },
            "num_rows": {
                "type": "integer",
                "description": "Number of rows to sample (default: 100)"
            }
        },
        "required": ["file_path"]
    }
}


# All available tools
ALL_TOOLS = [
    LIST_FILES_TOOL,
    GET_FILE_INFO_TOOL,
    EXECUTE_ANALYSIS_TOOL,
    GET_FILE_SAMPLE_TOOL,
]


# ============================================================================
# Tool Implementations
# ============================================================================

def handle_list_files(trial_name: str = None, file_pattern: str = None) -> Dict[str, Any]:
    """Handle list_files tool call."""
    files = list_available_files(trial_name=trial_name, file_pattern=file_pattern)
    return {
        "files": [
            {
                "file_path": f["file_path"],
                "file_name": f["file_name"],
                "file_size_mb": round(f["file_size"] / (1024 * 1024), 2),
                "source": f["source"],
                "trial_name": f.get("trial_name"),
            }
            for f in files[:20]  # Limit to 20 files
        ],
        "total_count": len(files),
    }


def handle_get_file_info(file_path: str) -> Dict[str, Any]:
    """Handle get_file_info tool call."""
    return get_file_metadata(file_path)


def handle_execute_analysis(code: str, file_mapping: Dict[str, str]) -> Dict[str, Any]:
    """Handle execute_analysis tool call."""
    executor = CodeExecutor()
    return executor.execute(code=code, file_paths=file_mapping)


def handle_get_file_sample(file_path: str, num_rows: int = 100) -> Dict[str, Any]:
    """Handle get_file_sample tool call."""
    return get_file_sample(file_path, num_rows=num_rows)


# Tool handler mapping
TOOL_HANDLERS: Dict[str, Callable] = {
    "list_files": handle_list_files,
    "get_file_info": handle_get_file_info,
    "execute_analysis": handle_execute_analysis,
    "get_file_sample": handle_get_file_sample,
}


# ============================================================================
# ADK Agent Class
# ============================================================================

class DataScienceAgent:
    """
    Google ADK-style agent for data science analysis.

    Uses function calling to let the LLM decide which tools to use
    and generates code dynamically for analysis.
    """

    def __init__(self, api_key: str = None, model_name: str = None):
        """
        Initialize the agent.

        Args:
            api_key: Google API key (uses GOOGLE_API_KEY env var if not provided)
            model_name: Model to use (default from config)
        """
        if api_key:
            genai.configure(api_key=api_key)
        else:
            genai.configure()

        self.model_name = model_name or config.model_name

        # Create model with tools
        self.model = genai.GenerativeModel(
            model_name=self.model_name,
            tools=[{"function_declarations": ALL_TOOLS}],
            system_instruction=self._get_system_prompt()
        )

        self.chat_history: List[Dict[str, Any]] = []

    def _get_system_prompt(self) -> str:
        """Get system prompt for the agent."""
        return """You are a Data Science and ML Analysis Agent. Your job is to analyze data files and answer user questions.

WORKFLOW:
1. When user asks a question, first use list_files to see available data
2. Use get_file_info to understand the structure of relevant files
3. Use get_file_sample if you need to see actual data values
4. Use execute_analysis to run Python code for analysis

IMPORTANT RULES FOR execute_analysis:
- DataFrames are loaded automatically based on file_mapping
- Use pandas (pd), numpy (np), matplotlib (plt), seaborn (sns), scipy.stats, sklearn
- Always store your final answer in a variable called 'result'
- Create visualizations when helpful using plt or sns
- Handle missing values gracefully
- Print intermediate steps for debugging

Example code structure:
```python
# Understand the data
print("Shape:", df1.shape)
print("Columns:", list(df1.columns))

# Perform analysis
numeric_cols = df1.select_dtypes(include=[np.number]).columns
correlations = df1[numeric_cols].corr()

# Create visualization
plt.figure(figsize=(10, 8))
sns.heatmap(correlations, annot=True, cmap='coolwarm')
plt.title('Correlation Matrix')

# Store result
result = {
    'correlations': correlations.to_dict(),
    'strongest': correlations.unstack().sort_values(ascending=False).head(5).to_dict()
}
```

Be thorough in your analysis and always explain your findings clearly."""

    def chat(self, message: str) -> Dict[str, Any]:
        """
        Process a user message and return response.

        Args:
            message: User's question/request

        Returns:
            Dictionary with:
            - response: Text response
            - tool_calls: List of tools called
            - plots: List of plot file paths
            - success: Whether analysis succeeded
        """
        tool_calls = []
        plots = []

        try:
            # Start chat
            chat = self.model.start_chat(history=self.chat_history)

            # Send message
            response = chat.send_message(message)

            # Process function calls
            while response.candidates[0].content.parts:
                part = response.candidates[0].content.parts[0]

                # Check if it's a function call
                if hasattr(part, 'function_call') and part.function_call:
                    func_call = part.function_call
                    func_name = func_call.name
                    func_args = dict(func_call.args) if func_call.args else {}

                    print(f"[Tool Call] {func_name}({func_args})")

                    # Execute the tool
                    if func_name in TOOL_HANDLERS:
                        tool_result = TOOL_HANDLERS[func_name](**func_args)

                        # Collect plots if any
                        if func_name == "execute_analysis" and tool_result.get('plots'):
                            plots.extend(tool_result['plots'])

                        tool_calls.append({
                            'name': func_name,
                            'args': func_args,
                            'result': tool_result
                        })

                        # Send result back to model
                        response = chat.send_message(
                            genai.protos.Content(
                                parts=[
                                    genai.protos.Part(
                                        function_response=genai.protos.FunctionResponse(
                                            name=func_name,
                                            response={"result": json.dumps(tool_result, default=str)}
                                        )
                                    )
                                ]
                            )
                        )
                    else:
                        print(f"Unknown tool: {func_name}")
                        break
                else:
                    # It's a text response, we're done
                    break

            # Extract final text response
            final_response = ""
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'text') and part.text:
                    final_response += part.text

            # Update history
            self.chat_history = chat.history

            return {
                'response': final_response,
                'tool_calls': tool_calls,
                'plots': plots,
                'success': True,
            }

        except Exception as e:
            print(f"Error in chat: {e}")
            return {
                'response': f"An error occurred: {str(e)}",
                'tool_calls': tool_calls,
                'plots': plots,
                'success': False,
            }

    def reset_history(self):
        """Clear chat history."""
        self.chat_history = []


# ============================================================================
# Convenience function
# ============================================================================

def create_agent(api_key: str = None) -> DataScienceAgent:
    """
    Create and return a DataScienceAgent instance.

    Args:
        api_key: Optional Google API key

    Returns:
        Configured DataScienceAgent
    """
    return DataScienceAgent(api_key=api_key)


# ============================================================================
# Example usage
# ============================================================================

if __name__ == "__main__":
    import os

    # Create agent
    agent = create_agent()

    # Example queries
    queries = [
        "What data files are available?",
        "Tell me about the structure of the first file",
        "Calculate the correlation between numerical columns",
    ]

    for query in queries:
        print(f"\n{'='*60}")
        print(f"User: {query}")
        print('='*60)

        result = agent.chat(query)

        print(f"\nAssistant: {result['response']}")
        print(f"\nTool calls: {len(result['tool_calls'])}")
        print(f"Plots: {result['plots']}")
