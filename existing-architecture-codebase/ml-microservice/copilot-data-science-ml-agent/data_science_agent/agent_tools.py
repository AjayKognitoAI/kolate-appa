"""Tool registry and execution for the Data Science Agent."""

from typing import Dict, Any, Callable
from .agent_config import MAX_TOOL_OUTPUT_LENGTH


class ToolRegistry:
    """Manages tool registration and execution."""

    def __init__(self, tools: Dict[str, Callable]):
        """Initialize tool registry."""
        self.tools = tools

    def execute_tool(self, tool_name: str, tool_args: Dict[str, Any]) -> str:
        """
        Execute a tool and return the result.

        Args:
            tool_name: Name of the tool to execute
            tool_args: Arguments to pass to the tool

        Returns:
            Tool execution result as string
        """
        if tool_name not in self.tools:
            return f"Error: Unknown tool '{tool_name}'. Available tools: {', '.join(self.tools.keys())}"

        try:
            tool_func = self.tools[tool_name]
            result = tool_func(**tool_args)
            result_str = str(result)
            # Limit output length
            if len(result_str) > MAX_TOOL_OUTPUT_LENGTH:
                result_str = result_str[:MAX_TOOL_OUTPUT_LENGTH] + "...[truncated]"
            return result_str
        except TypeError as e:
            return f"Error: Invalid arguments for {tool_name}. {str(e)}"
        except Exception as e:
            return f"Error executing {tool_name}: {str(e)}"

    def get_descriptions(self) -> str:
        """Get formatted descriptions of all available tools."""
        descriptions = []
        for name, func in self.tools.items():
            doc = func.__doc__ or "No description available"
            descriptions.append(f"- {name}: {doc}")
        return "\n".join(descriptions)

    def get_tool_count(self) -> int:
        """Get count of available tools."""
        return len(self.tools)
