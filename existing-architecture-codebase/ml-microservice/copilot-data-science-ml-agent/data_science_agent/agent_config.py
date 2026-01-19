"""Configuration for the Data Science Agent."""

# Agent settings
MAX_ITERATIONS = 10
MODEL_NAME = "gemini-2.0-flash-exp"

# Response settings
HIDE_THINKING = True
RESULT_ONLY = True
MAX_TOOL_OUTPUT_LENGTH = 1000

# Tool call format
TOOL_CALL_FORMAT = "<tool_call>tool_name:param1=value1,param2=value2</tool_call>"
