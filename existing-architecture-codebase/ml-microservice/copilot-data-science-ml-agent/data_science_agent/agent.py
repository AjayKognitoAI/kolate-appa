"""Main orchestrator agent implementation using Google ADK."""

import os
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import Google Generative AI
import google.generativeai as genai

# Import database manager
from .database import DatabaseManager

# Import modular components
from .agent_config import MODEL_NAME, MAX_ITERATIONS
from .agent_tools import ToolRegistry
from .agent_executor import AgentExecutor

# Import tools
from .sub_agents.csv_analyzer.tools import (
    load_csv_file,
    get_column_statistics,
    analyze_correlations,
    detect_outliers,
    create_visualization,
    check_data_quality,
    perform_comprehensive_eda,
    generate_insights,
    find_evidence,
    detect_patterns,
    generate_data_story,
)
from .sub_agents.research_analyzer.tools import (
    parse_research_paper,
    extract_key_findings,
    analyze_paper_statistics,
    summarize_paper,
)
from .sub_agents.statistical_analyzer.tools import (
    perform_ttest,
    perform_chi_square,
    perform_anova,
    test_normality,
    calculate_confidence_interval,
    perform_correlation_test,
    detect_outliers_advanced,
)
from .sub_agents.ml_analyzer.tools import (
    recommend_ml_algorithm,
    suggest_feature_engineering,
    check_ml_readiness,
    suggest_model_evaluation,
)


class DataScienceAgent:
    """Main orchestrator agent for data science analysis."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: str = MODEL_NAME,
        database_url: Optional[str] = None,
    ):
        """
        Initialize the Data Science Agent.

        Args:
            api_key: Google API key (defaults to GOOGLE_API_KEY env var)
            model_name: Model to use
            database_url: Database URL (defaults to DATABASE_URL env var)
        """
        # Setup Google AI
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "GOOGLE_API_KEY not found in environment variables. "
                "Get a free API key from: https://aistudio.google.com/app/apikey"
            )

        try:
            genai.configure(api_key=self.api_key)
            self.model_name = model_name
        except Exception as e:
            raise ValueError(
                f"Failed to initialize Google Generative AI with the provided API key. "
                f"Error: {str(e)}. "
                f"Ensure you're using an API key from https://aistudio.google.com/app/apikey "
                f"(NOT a service account key from Google Cloud Console)"
            ) from e

        # Setup database
        self.db_manager = DatabaseManager(database_url)
        self.db_manager.create_tables()

        # Setup tools and executor
        tools_dict = self._setup_tools()
        self.tool_registry = ToolRegistry(tools_dict)
        self.executor = AgentExecutor(model_name, self.tool_registry)

        print(f"[OK] Data Science Agent initialized with {model_name}")
        print(f"[OK] Database connected: {self.db_manager.database_url}")
        print(f"[OK] Available tools: {self.tool_registry.get_tool_count()}")

    def _setup_tools(self) -> Dict[str, Any]:
        """Setup all available tools."""
        return {
            # CSV Analyzer tools
            "load_csv_file": load_csv_file,
            "get_column_statistics": get_column_statistics,
            "analyze_correlations": analyze_correlations,
            "detect_outliers": detect_outliers,
            "create_visualization": create_visualization,
            "check_data_quality": check_data_quality,
            # EDA & Insights tools
            "perform_comprehensive_eda": perform_comprehensive_eda,
            "generate_insights": generate_insights,
            "find_evidence": find_evidence,
            "detect_patterns": detect_patterns,
            "generate_data_story": generate_data_story,
            # Research Analyzer tools
            "parse_research_paper": parse_research_paper,
            "extract_key_findings": extract_key_findings,
            "analyze_paper_statistics": analyze_paper_statistics,
            "summarize_paper": summarize_paper,
            # Statistical Analyzer tools
            "perform_ttest": perform_ttest,
            "perform_chi_square": perform_chi_square,
            "perform_anova": perform_anova,
            "test_normality": test_normality,
            "calculate_confidence_interval": calculate_confidence_interval,
            "perform_correlation_test": perform_correlation_test,
            "detect_outliers_advanced": detect_outliers_advanced,
            # ML Analyzer tools
            "recommend_ml_algorithm": recommend_ml_algorithm,
            "suggest_feature_engineering": suggest_feature_engineering,
            "check_ml_readiness": check_ml_readiness,
            "suggest_model_evaluation": suggest_model_evaluation,
        }

    def create_session(self, user_id: Optional[str] = None) -> str:
        """
        Create a new session.

        Args:
            user_id: Optional user identifier

        Returns:
            Session ID
        """
        session = self.db_manager.create_session(user_id=user_id)
        return session.id


    def analyze(
        self,
        session_id: str,
        user_message: str,
        file_paths: Optional[List[str]] = None,
    ) -> str:
        """
        Analyze user request and provide response.

        Args:
            session_id: Session ID
            user_message: User's message/question
            file_paths: Optional list of file paths to analyze

        Returns:
            Agent's response
        """
        # Get session
        session = self.db_manager.get_session(session_id)
        if not session or not session.is_active:
            return "Error: Invalid or inactive session. Please create a new session."

        try:
            # Get conversation history
            history = self.db_manager.get_conversation_history(session_id)
            context_messages = []
            for turn in history[-5:]:  # Last 5 turns
                context_messages.append(f"User: {turn.user_message}")
                if turn.agent_response:
                    context_messages.append(f"Assistant: {turn.agent_response}")

            # Run executor with tool calling
            agent_response = self.executor.execute(
                user_message=user_message,
                conversation_history=context_messages,
                file_paths=file_paths,
                max_iterations=MAX_ITERATIONS,
            )

            # Save conversation turn
            self.db_manager.add_conversation_turn(
                session_id=session_id,
                user_message=user_message,
                agent_response=agent_response,
                agent_type="orchestrator",
            )

            return agent_response

        except Exception as e:
            error_msg = f"Error generating response: {str(e)}"
            self.db_manager.add_conversation_turn(
                session_id=session_id,
                user_message=user_message,
                agent_response=error_msg,
                agent_type="orchestrator",
            )
            return error_msg

    def get_session_history(self, session_id: str) -> List[Dict[str, Any]]:
        """
        Get conversation history for a session.

        Args:
            session_id: Session ID

        Returns:
            List of conversation turns
        """
        history = self.db_manager.get_conversation_history(session_id)
        return [
            {
                "turn": turn.turn_number,
                "user_message": turn.user_message,
                "agent_response": turn.agent_response,
                "agent_type": turn.agent_type,
                "timestamp": turn.created_at,
            }
            for turn in history
        ]

    def get_session_analyses(self, session_id: str) -> List[Dict[str, Any]]:
        """
        Get all analysis results for a session.

        Args:
            session_id: Session ID

        Returns:
            List of analysis results
        """
        analyses = self.db_manager.get_session_analyses(session_id)
        return [
            {
                "analysis_type": analysis.analysis_type,
                "result_data": analysis.result_data,
                "visualizations": analysis.visualizations,
                "timestamp": analysis.created_at,
            }
            for analysis in analyses
        ]


def main():
    """Main function for running the agent."""
    print("=" * 60)
    print("Data Science & ML Chatbot")
    print("=" * 60)
    print()

    # Initialize agent
    agent = DataScienceAgent()

    # Create session
    session_id = agent.create_session(user_id="demo_user")
    print(f"Session created: {session_id}")
    print()

    # Interactive loop
    print("You can now interact with the agent. Type 'quit' to exit.")
    print("Upload files by typing: file:/path/to/file.csv")
    print()

    while True:
        user_input = input("You: ").strip()

        if user_input.lower() in ["quit", "exit"]:
            print("Goodbye!")
            break

        if not user_input:
            continue

        # Check for file paths
        file_paths = []
        if user_input.startswith("file:"):
            file_path = user_input[5:].strip()
            file_paths.append(file_path)
            user_input = f"Please analyze the file: {file_path}"

        # Get response
        response = agent.analyze(session_id, user_input, file_paths)
        print(f"\nAgent: {response}\n")


if __name__ == "__main__":
    main()
