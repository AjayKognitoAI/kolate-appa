"""Prompt building utilities for the Data Science Agent."""

from typing import List, Optional
from .prompt import MAIN_AGENT_PROMPT


class PromptBuilder:
    """Builds prompts for the agent with context."""

    def __init__(self, main_prompt: str = MAIN_AGENT_PROMPT):
        """Initialize prompt builder."""
        self.main_prompt = main_prompt

    def build_initial_prompt(
        self,
        user_message: str,
        tool_descriptions: str,
        conversation_history: List[str],
        file_paths: Optional[List[str]] = None,
    ) -> str:
        """Build the initial prompt for agent."""
        history_text = "\n".join(conversation_history) if conversation_history else "No previous conversation."

        # Format file paths clearly
        if file_paths:
            files_text = "The following files are READY FOR ANALYSIS:\n"
            for i, path in enumerate(file_paths, 1):
                # Normalize path separators
                clean_path = path.replace("\\", "/")
                files_text += f"{i}. {clean_path}\n"
        else:
            files_text = "No files provided. If user wants to analyze a file, ask them to upload it first."

        prompt = f"""{self.main_prompt}

## Available Tools
{tool_descriptions}

## Conversation History
{history_text}

## User Request
{user_message}

## Files for Analysis
{files_text}

## CRITICAL: Tool Calling Format
YOU MUST use this EXACT format when calling tools. Do NOT skip this format.

When you need to call a tool, output it like this:
<tool_call>tool_name:param1="value1",param2="value2"</tool_call>

Examples:
- For CSV analysis: <tool_call>load_csv_file:file_path="./path/to/data.csv"</tool_call>
- For EDA: <tool_call>perform_comprehensive_eda:file_path="./path/to/data.csv"</tool_call>
- For insights: <tool_call>generate_insights:file_path="./path/to/data.csv"</tool_call>

## Instructions
1. ALWAYS use the <tool_call>...</tool_call> format above
2. Use EXACT file paths from the Files section above
3. Quote all file paths with double quotes
4. Only return results after tool execution
5. Do NOT show planning or reasoning - only results
"""
        return prompt

    def build_followup_prompt(
        self,
        previous_response: str,
        tool_results: List[str],
    ) -> str:
        """Build followup prompt with tool results."""
        results_text = "\n".join(tool_results)

        prompt = f"""{previous_response}

## Tool Results Received
{results_text}

## Next Steps
Based on the above tool results, provide a comprehensive final analysis and insights.
Focus on actionable findings and recommendations only.
"""
        return prompt
