"""Agent execution loop for tool-based analysis."""

import re
from typing import Optional, List
import google.generativeai as genai
from .agent_config import MAX_ITERATIONS, HIDE_THINKING, RESULT_ONLY
from .agent_tools import ToolRegistry
from .agent_prompt_builder import PromptBuilder
from .code_executor import BuiltInCodeExecutor


class AgentExecutor:
    """Executes the agent loop with silent tool execution."""

    def __init__(self, model_name: str, tool_registry: ToolRegistry):
        """
        Initialize agent executor.

        Args:
            model_name: LLM model to use
            tool_registry: Registry of available tools
        """
        self.model = genai.GenerativeModel(model_name)
        self.tool_registry = tool_registry
        self.prompt_builder = PromptBuilder()
        # Use BuiltInCodeExecutor for silent execution
        self.code_executor = BuiltInCodeExecutor(tool_registry.tools)

    def execute(
        self,
        user_message: str,
        conversation_history: List[str],
        file_paths: Optional[List[str]] = None,
        max_iterations: int = MAX_ITERATIONS,
    ) -> str:
        """
        Execute the agent silently, showing only final insights.

        Args:
            user_message: User's request
            conversation_history: Previous conversation turns
            file_paths: Files to analyze
            max_iterations: Maximum loop iterations

        Returns:
            Only final insights (no intermediate steps)
        """
        try:
            # Build initial prompt - tell agent to execute silently
            tool_descriptions = self.tool_registry.get_descriptions()
            full_prompt = self._build_silent_execution_prompt(
                user_message=user_message,
                tool_descriptions=tool_descriptions,
                conversation_history=conversation_history,
                file_paths=file_paths,
            )

            iteration = 0

            while iteration < max_iterations:
                iteration += 1

                # Generate response from agent
                response = self.model.generate_content(full_prompt)
                agent_text = response.text

                # Extract tool calls
                tool_calls = self._extract_tool_calls(agent_text)

                if tool_calls:
                    # Execute tools SILENTLY using BuiltInCodeExecutor
                    tool_results = self._execute_tools_silently(tool_calls)

                    # Ask agent for final insights only
                    full_prompt = f"""Based on the analysis results, provide ONLY the final insights and findings.
Do NOT show tool calls, code, or methodology.
Do NOT mention intermediate steps.
Provide ONLY actionable insights and recommendations.

Analysis Results Summary:
{self._summarize_results(tool_results)}

Please provide the final insights:"""
                    continue

                # No tool calls - agent is done analyzing
                # Extract only insights, no code or methodology
                final_response = self._extract_final_insights(agent_text)
                return final_response if final_response else agent_text

            return "Analysis complete."

        except Exception as e:
            return f"Analysis error: {str(e)}"

    def _build_silent_execution_prompt(
        self,
        user_message: str,
        tool_descriptions: str,
        conversation_history: List[str],
        file_paths: Optional[List[str]] = None,
    ) -> str:
        """Build prompt that instructs silent execution."""
        history_text = "\n".join(conversation_history) if conversation_history else "No previous conversation."

        files_text = ""
        if file_paths:
            files_text = "Files to analyze:\n"
            for i, path in enumerate(file_paths, 1):
                clean_path = path.replace("\\", "/")
                files_text += f"{i}. {clean_path}\n"
        else:
            files_text = "No files provided."

        prompt = f"""You are a data analysis expert. Your task is to analyze data and provide insights.

## Tools Available (USE SILENTLY)
{tool_descriptions}

## Your Instructions
1. EXECUTE all necessary tools SILENTLY to analyze the data
2. Do NOT show tool calls, code, or intermediate steps
3. Only show FINAL insights and findings
4. Format tool calls as: <tool_call>tool_name:param1="value1",param2="value2"</tool_call>
5. After execution, provide ONLY final results and recommendations

## Analysis Task
{user_message}

## Data Files
{files_text}

## Conversation History
{history_text}

BEGIN ANALYSIS - Show only final insights, no intermediate steps.
"""
        return prompt

    def _extract_tool_calls(self, text: str) -> List[tuple]:
        """Extract tool calls from agent response."""
        pattern = r"<tool_call>(\w+):([^<]+)</tool_call>"
        matches = re.findall(pattern, text)
        return matches

    def _execute_tools_silently(self, tool_calls: List[tuple]) -> dict:
        """Execute tools silently and return results."""
        results = {}

        for tool_name, params_str in tool_calls:
            # Parse parameters
            tool_args = self._parse_tool_parameters(params_str)

            # Execute using BuiltInCodeExecutor
            result = self.code_executor.execute(tool_name, tool_args)
            results[tool_name] = result

        return results

    def _parse_tool_parameters(self, params_str: str) -> dict:
        """Parse tool parameters from string."""
        tool_args = {}

        param_pattern = r'(\w+)=(?:"([^"]*)"|\'([^\']*)\'|([^,\s]+))'
        matches = re.findall(param_pattern, params_str)

        for key, dval, sval, unquoted in matches:
            val = dval or sval or unquoted
            tool_args[key] = val.strip()

        return tool_args

    def _summarize_results(self, tool_results: dict) -> str:
        """Summarize tool results for agent."""
        summary_lines = []

        for tool_name, result in tool_results.items():
            if isinstance(result, dict) and "error" not in result:
                if "insights" in result:
                    summary_lines.append(f"✓ {tool_name}: Analysis completed with insights")
                elif "status" in result and result["status"] == "success":
                    summary_lines.append(f"✓ {tool_name}: Analysis completed successfully")
                else:
                    summary_lines.append(f"✓ {tool_name}: Result available")
            elif isinstance(result, dict) and "error" in result:
                summary_lines.append(f"✗ {tool_name}: {result['error']}")

        return "\n".join(summary_lines)

    def _extract_final_insights(self, text: str) -> str:
        """Extract only final insights from agent response."""
        # Remove tool calls
        text = re.sub(r"<tool_call>.*?</tool_call>", "", text, flags=re.DOTALL)

        # Remove thinking blocks
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
        text = re.sub(r"```thinking\n.*?\n```", "", text, flags=re.DOTALL)

        # Remove lines that reference tool execution
        lines = text.split("\n")
        filtered = []
        skip_keywords = ["tool_call", "load_csv", "First,", "I will", "I need to", "execute", "calling"]

        for line in lines:
            if not any(keyword.lower() in line.lower() for keyword in skip_keywords):
                filtered.append(line)

        result = "\n".join(filtered).strip()

        # Clean up excess whitespace
        result = re.sub(r"\n\n\n+", "\n\n", result)

        return result
