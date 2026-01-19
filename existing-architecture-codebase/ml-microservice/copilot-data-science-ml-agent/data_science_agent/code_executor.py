"""Silent code/tool executor for the agent."""

import json
from typing import Dict, Any, Optional, Callable


class BuiltInCodeExecutor:
    """Executes tools silently and caches results."""

    def __init__(self, tools: Dict[str, Callable]):
        """Initialize executor with available tools."""
        self.tools = tools
        self.execution_cache = {}
        self.last_execution_results = {}

    def execute(self, tool_name: str, tool_args: Dict[str, Any]) -> Any:
        """
        Execute a tool silently and return raw result.

        Args:
            tool_name: Name of the tool
            tool_args: Arguments for the tool

        Returns:
            Parsed result (dict or data)
        """
        # Create cache key
        cache_key = f"{tool_name}:{json.dumps(tool_args, sort_keys=True, default=str)}"

        # Return cached result if available
        if cache_key in self.execution_cache:
            return self.execution_cache[cache_key]

        # Execute tool
        if tool_name not in self.tools:
            result = {"error": f"Unknown tool: {tool_name}"}
        else:
            try:
                tool_func = self.tools[tool_name]
                raw_result = tool_func(**tool_args)

                # Try to parse JSON result
                if isinstance(raw_result, str):
                    try:
                        result = json.loads(raw_result)
                    except json.JSONDecodeError:
                        result = {"raw_output": raw_result}
                else:
                    result = raw_result

            except Exception as e:
                result = {"error": str(e)}

        # Cache result
        self.execution_cache[cache_key] = result
        self.last_execution_results[tool_name] = result

        return result

    def get_insights_from_results(self, tool_results: Dict[str, Any]) -> str:
        """
        Extract only the insights/findings from tool results.

        Args:
            tool_results: Dictionary of tool execution results

        Returns:
            Formatted insights text
        """
        insights = []

        for tool_name, result in tool_results.items():
            if isinstance(result, dict):
                if "error" in result:
                    # Skip errors, don't show them
                    continue

                if "insights" in result:
                    # Extract insights section
                    insights_data = result["insights"]
                    insights.append(f"## {tool_name.replace('_', ' ').title()}")
                    insights.append(self._format_insights(insights_data))

                elif "summary" in result:
                    # Extract summary
                    insights.append(f"## {tool_name.replace('_', ' ').title()}")
                    insights.append(result["summary"])

                elif "status" in result and result["status"] == "success":
                    # Show success with key findings
                    if "dataset_overview" in result:
                        insights.append(f"## Dataset Overview")
                        insights.append(self._format_dict(result["dataset_overview"]))

        return "\n\n".join(insights)

    def _format_insights(self, insights_data: Any) -> str:
        """Format insights data for display."""
        if isinstance(insights_data, dict):
            lines = []
            for key, value in insights_data.items():
                if isinstance(value, (list, dict)):
                    lines.append(f"**{key}:**")
                    if isinstance(value, list):
                        for item in value[:3]:  # Limit to first 3 items
                            lines.append(f"  - {item}")
                    else:
                        for k, v in list(value.items())[:3]:
                            lines.append(f"  - {k}: {v}")
                else:
                    lines.append(f"**{key}:** {value}")
            return "\n".join(lines)
        return str(insights_data)

    def _format_dict(self, data: Dict) -> str:
        """Format dictionary for display."""
        lines = []
        for key, value in data.items():
            if isinstance(value, (int, float)):
                lines.append(f"- **{key}:** {value}")
            elif isinstance(value, (list, dict)):
                lines.append(f"- **{key}:** {len(value) if isinstance(value, list) else len(value)} items")
            else:
                lines.append(f"- **{key}:** {value}")
        return "\n".join(lines)

    def clear_cache(self):
        """Clear execution cache."""
        self.execution_cache.clear()
        self.last_execution_results.clear()
