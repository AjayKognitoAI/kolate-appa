"""Simple LLM orchestrator using LiteLLM with RAG context."""

import litellm
from typing import Dict, Any, List, Optional
import os
from datetime import datetime

from api.agent.rag_system import RAGSystem


class ChatHandler:
    """Orchestrates LLM calls with RAG-retrieved context."""

    def __init__(self, rag_system: RAGSystem):
        """Initialize chat handler.

        Args:
            rag_system: RAGSystem instance for context retrieval
        """
        self.rag_system = rag_system

        # LiteLLM model name from .env - supports any provider
        # Examples: gpt-4, claude-3-sonnet-20240229, gemini/gemini-pro, azure/my-deployment
        self.model_name = os.getenv("MODEL_NAME", "gpt-4")
        self.temperature = float(os.getenv("TEMPERATURE", "0.7"))
        self.max_tokens = int(os.getenv("MAX_TOKENS", "2000"))

        print(f"[ChatHandler] Initialized with model: {self.model_name}")

    def chat(
        self,
        session_id: str,
        user_message: str,
        turn_number: int = 1,
        file_name: Optional[str] = None,
        trial_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process user message and return LLM response with RAG context.

        Args:
            session_id: Unique session identifier
            user_message: User's question or message
            turn_number: Conversation turn number
            file_name: Optional file name for context filtering
            trial_name: Optional trial name for trial-based context retrieval

        Returns:
            Dictionary with response and metadata
        """
        try:
            # Retrieve relevant context from vector DB
            # Use trial context if trial_name is provided, otherwise use session context
            if trial_name:
                context_docs = self._retrieve_trial_context(trial_name, user_message)
                print(f"[ChatHandler] Retrieved {len(context_docs)} trial context documents for trial '{trial_name}'")
            else:
                context_docs = self._retrieve_context(session_id, user_message, file_name)
                print(f"[ChatHandler] Retrieved {len(context_docs)} context documents for session {session_id}")
            for i, doc in enumerate(context_docs[:3]):  # Show first 3
                print(f"  [{i}] Type: {doc['metadata'].get('type')}, Preview: {doc['document'][:100]}...")

            context_text = self._format_context(context_docs, trial_name)
            print(f"[ChatHandler] Context length: {len(context_text)} chars")

            # Build system prompt for data science expert
            system_prompt = self._build_system_prompt(context_text, trial_name)

            # Build messages for LLM
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]

            # Call LLM via LiteLLM - automatically uses correct API key from env vars
            # Set API keys in .env: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, AZURE_API_KEY, etc.
            response = litellm.completion(
                model=self.model_name,
                messages=messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )

            assistant_response = response.choices[0].message.content

            # Store conversation in RAG for future context
            self.rag_system.store_conversation(
                session_id,
                user_message,
                assistant_response,
                turn_number
            )

            return {
                "response": assistant_response,
                "session_id": session_id,
                "turn_number": turn_number,
                "timestamp": datetime.now().isoformat(),
                "context_documents_used": len(context_docs)
            }

        except Exception as e:
            error_msg = f"Error processing message: {str(e)}"
            print(error_msg)
            return {
                "response": f"I encountered an error while processing your request: {str(e)}",
                "session_id": session_id,
                "turn_number": turn_number,
                "timestamp": datetime.now().isoformat(),
                "error": True
            }

    def _retrieve_context(
        self,
        session_id: str,
        query: str,
        file_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve relevant context from RAG system.

        Args:
            session_id: Unique session identifier
            query: User query for semantic search
            file_name: Optional file filter (can be full path or just filename)

        Returns:
            List of relevant documents
        """
        # Retrieve diverse document types for comprehensive context
        context = self.rag_system.retrieve_context(
            session_id,
            query,
            top_k=15,  # Get more documents for better context
            include_types=None  # Get all types
        )

        # Optionally filter by file if specified
        # Note: Each session has its own collection, so file filtering is usually not needed
        # But if provided, extract just the filename (not full path) for comparison
        if file_name and len(context) > 0:
            import os
            # Extract just the filename from path, and also handle session-prefixed filenames
            base_name = os.path.basename(file_name)
            # Remove session prefix if present (format: sessionid_timestamp_originalname)
            parts = base_name.split('_', 2)  # Split into at most 3 parts
            if len(parts) >= 3:
                # Likely has session_timestamp_filename format, use the last part
                original_name = parts[2]
            else:
                original_name = base_name

            # Filter by matching the original filename
            filtered = [
                doc for doc in context
                if doc["metadata"].get("file") == original_name or
                   doc["metadata"].get("file") == base_name or
                   original_name in str(doc["metadata"].get("file", ""))
            ]
            # Only use filtered if it has results, otherwise keep all context
            if filtered:
                context = filtered

        # Prioritize different document types
        prioritized = self._prioritize_documents(context)

        return prioritized[:10]  # Return top 10 most relevant

    def _prioritize_documents(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Prioritize documents by relevance and type.

        Args:
            documents: List of retrieved documents

        Returns:
            Sorted list with most relevant first
        """
        # Custom sorting: closer distance is better (lower score)
        # Prioritize: findings > insights > statistics > conversations > metadata
        type_priority = {
            "finding": 0,
            "insight": 1,
            "recommendation": 2,
            "statistics": 3,
            "correlations": 4,
            "outliers": 5,
            "conversation": 6,
            "quality": 7,
            "metadata": 8
        }

        def sort_key(doc):
            doc_type = doc["metadata"].get("type", "unknown")
            priority = type_priority.get(doc_type, 99)
            distance = doc.get("distance", float('inf'))
            return (priority, distance)

        return sorted(documents, key=sort_key)

    def _retrieve_trial_context(
        self,
        trial_name: str,
        query: str
    ) -> List[Dict[str, Any]]:
        """Retrieve relevant context from a trial's RAG collection.

        Args:
            trial_name: Name of the trial
            query: User query for semantic search

        Returns:
            List of relevant documents
        """
        # Retrieve from trial collection (shared across sessions)
        context = self.rag_system.retrieve_trial_context(
            trial_name,
            query,
            top_k=15,
            include_types=None  # Get all types
        )

        # Prioritize different document types
        prioritized = self._prioritize_documents(context)

        return prioritized[:10]  # Return top 10 most relevant

    def _format_context(self, context_docs: List[Dict[str, Any]], trial_name: Optional[str] = None) -> str:
        """Format retrieved context into readable text.

        Args:
            context_docs: List of retrieved documents
            trial_name: Optional trial name for context header

        Returns:
            Formatted context string
        """
        if not context_docs:
            return "NO_DATA_UPLOADED"

        if trial_name:
            context_parts = [f"## Analysis Context for Trial: {trial_name}\n"]
        else:
            context_parts = ["## Analysis Context and Prior Results\n"]

        current_type = None
        for doc in context_docs:
            doc_type = doc["metadata"].get("type", "unknown")

            # Add type header
            if doc_type != current_type:
                current_type = doc_type
                context_parts.append(f"\n### {doc_type.replace('_', ' ').title()}")

            # Add document
            context_parts.append(f"- {doc['document'][:500]}")  # Limit doc length

        return "\n".join(context_parts)

    def _build_system_prompt(self, context: str, trial_name: Optional[str] = None) -> str:
        """Build system prompt for data science expert role.

        Args:
            context: Retrieved context from RAG
            trial_name: Optional trial name for trial-specific prompting

        Returns:
            System prompt
        """
        # Check if no data has been uploaded
        no_data = context == "NO_DATA_UPLOADED"

        base_prompt = """You are an expert Data Scientist and Statistician with deep knowledge of:
- Exploratory Data Analysis (EDA) and data quality assessment
- Statistical hypothesis testing and inference
- Machine Learning model selection and evaluation
- Data visualization and insights communication
- Research methodology and evidence-based analysis

"""

        if no_data:
            return base_prompt + """IMPORTANT - No Data Uploaded Yet:
The user has NOT uploaded any data files yet. You cannot perform any analysis without data.

Your response should:
1. Warmly greet the user and introduce yourself as their data science assistant
2. Explain that you need data to analyze before you can help
3. Ask them to upload one or more files (CSV, Excel, PDF, JSON, or Text files are supported)
4. Mention that they can upload MULTIPLE files and you can analyze them together or separately
5. Give examples of what you can help with once they upload data:
   - Exploratory Data Analysis (EDA)
   - Statistical summaries and distributions
   - Correlation analysis
   - Outlier detection
   - Data quality assessment
   - Visualizations (histograms, box plots, scatter plots, heatmaps)
   - Hypothesis testing
   - Machine learning recommendations

Example response:
"Hello! I'm your Data Science Assistant, ready to help you analyze your data and uncover valuable insights.

I notice you haven't uploaded any data files yet. To get started, please upload one or more files using the upload button. I support:
- **CSV files** - tabular data
- **Excel files** (.xlsx, .xls)
- **PDF documents** - research papers, reports
- **JSON files** - structured data
- **Text files** - unstructured text

You can upload **multiple files** and I'll analyze them all! Once uploaded, I can help you with statistical analysis, visualizations, correlations, outlier detection, and much more.

What data would you like to explore today?"

Do NOT attempt to answer data-related questions without uploaded data. Always ask for data first."""

        # Add trial-specific context if applicable
        trial_info = ""
        if trial_name:
            trial_info = f"""
IMPORTANT - Trial Context:
- You are currently analyzing data from trial: "{trial_name}"
- All context below is from CSV files that have been pre-processed for this trial
- Multiple files may be available in this trial - the context includes insights from all of them
- When referencing data, mention which file it comes from when available in the metadata
- Users can ask questions about any aspect of the trial data

"""

        return base_prompt + trial_info + f"""You have the following pre-computed analysis results and context available:

{context}

IMPORTANT - Multiple Files Support:
- Users can upload MULTIPLE files (CSV, Excel, PDF, JSON, Text) in the same session
- All uploaded files are analyzed and their insights are available in the context above
- When answering questions, consider data from ALL uploaded files if relevant
- If the user asks about a specific file, focus on that file's analysis
- You can compare and contrast data across multiple uploaded files

When answering user questions:
1. Reference specific insights and statistics from the analysis context above
2. Provide evidence-based explanations grounded in the data
3. Use proper statistical language and methodologies
4. Suggest actionable next steps for analysis
5. Highlight data quality issues or limitations when relevant
6. Explain complex concepts clearly for different audience levels
7. If the user needs more data or different analysis, suggest uploading additional files

IMPORTANT - Visualizations:
- When relevant visualizations are available in the context, INCLUDE them in your response using markdown image syntax
- Format: ![Description](URL)
- Example: ![Correlation Matrix](/visualizations/session-id/correlation_matrix.png)
- Always show visualizations when discussing distributions, correlations, outliers, or categorical data
- The frontend will render these images automatically

IMPORTANT - Stay On Topic:
- You are ONLY here to help analyze the uploaded datasets
- ONLY answer questions related to the data, statistics, analysis, visualizations, or data science concepts relevant to the uploaded files
- If the user asks about unrelated topics (general chat, other subjects, off-topic questions), politely redirect them back to the data analysis
- Example response for off-topic questions: "I'm here to help you analyze your uploaded data. Let's focus on that - what would you like to know about your data? I can help with statistics, distributions, correlations, outliers, or any data science questions."
- If the user wants to analyze something not in the current data, suggest they upload the relevant file

IMPORTANT - Mathematical Equations (LaTeX):
- When writing mathematical equations, use proper LaTeX delimiters for rendering
- Use $...$ for inline math (e.g., $x^2 + y^2 = z^2$)
- Use $$...$$ for block/display math equations
- Example block equation:
  $$Z = \\frac{{(X - \\mu)}}{{\\sigma}}$$
- Do NOT use [...] or \\[...\\] notation for equations
- Common formulas to format properly: mean, standard deviation, z-scores, correlation coefficients, regression equations, etc.

Be concise but thorough. Always cite which part of the analysis supports your answer."""

    def get_conversation_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Get conversation history for a session.

        Args:
            session_id: Unique session identifier

        Returns:
            List of conversation turns
        """
        # Retrieve conversation documents from RAG
        context = self.rag_system.retrieve_context(
            session_id,
            "",  # Empty query to get all
            top_k=100,
            include_types=["conversation"]
        )

        # Parse and format conversation
        history = []
        current_turn = {}

        for doc in context:
            metadata = doc["metadata"]
            turn = metadata.get("turn", 0)

            if turn != current_turn.get("turn"):
                if current_turn:
                    history.append(current_turn)
                current_turn = {"turn": turn}

            role = metadata.get("role")
            if role == "user":
                current_turn["user_message"] = doc["document"]
            elif role == "assistant":
                current_turn["assistant_response"] = doc["document"]

        if current_turn:
            history.append(current_turn)

        return history
