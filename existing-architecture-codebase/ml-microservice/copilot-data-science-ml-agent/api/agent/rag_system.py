"""ChromaDB-based RAG system for per-session vector storage."""

import chromadb
import json
import os
import re
from typing import Dict, Any, List, Optional
from datetime import datetime
from chromadb.config import Settings


class RAGSystem:
    """Manages per-session and per-trial ChromaDB collections for semantic memory and knowledge retrieval."""

    def __init__(self, persist_dir: str = "./data/chroma_db"):
        """Initialize RAG system with ChromaDB.

        Args:
            persist_dir: Directory for persistent ChromaDB storage
        """
        self.persist_dir = persist_dir
        os.makedirs(persist_dir, exist_ok=True)

        # Initialize ChromaDB client with persistence
        self.client = chromadb.PersistentClient(path=persist_dir)
        self.active_collections: Dict[str, chromadb.Collection] = {}
        self.trial_collections: Dict[str, chromadb.Collection] = {}

    def create_session_collection(self, session_id: str) -> chromadb.Collection:
        """Create a new ChromaDB collection for a session.

        Args:
            session_id: Unique session identifier

        Returns:
            ChromaDB collection for this session
        """
        collection_name = f"session_{session_id}".replace("-", "_")

        try:
            # Get or create collection
            collection = self.client.get_or_create_collection(
                name=collection_name,
                metadata={"session_id": session_id, "created_at": datetime.now().isoformat()}
            )
            self.active_collections[session_id] = collection
            return collection
        except Exception as e:
            print(f"Error creating collection for session {session_id}: {e}")
            raise

    def get_collection(self, session_id: str) -> Optional[chromadb.Collection]:
        """Get existing collection for a session.

        Args:
            session_id: Unique session identifier

        Returns:
            ChromaDB collection or None if not found
        """
        if session_id in self.active_collections:
            return self.active_collections[session_id]

        try:
            collection_name = f"session_{session_id}".replace("-", "_")
            collection = self.client.get_collection(name=collection_name)
            self.active_collections[session_id] = collection
            return collection
        except Exception as e:
            print(f"Collection not found for session {session_id}: {e}")
            return None

    def embed_dataset_metadata(self, session_id: str, file_name: str, dataframe_info: Dict[str, Any]) -> None:
        """Embed dataset metadata into the vector store.

        Args:
            session_id: Unique session identifier
            file_name: Original file name
            dataframe_info: DataFrame information from analysis pipeline
        """
        collection = self.get_collection(session_id)
        if not collection:
            collection = self.create_session_collection(session_id)

        # Create metadata text documents
        metadata_docs = []
        doc_ids = []

        # Dataset overview
        overview = (
            f"Dataset: {file_name}. "
            f"Shape: {dataframe_info['num_rows']} rows, {dataframe_info['num_columns']} columns. "
            f"Numeric columns: {', '.join(dataframe_info.get('numeric_columns', []))}. "
            f"Categorical columns: {', '.join(dataframe_info.get('categorical_columns', []))}"
        )
        metadata_docs.append(overview)
        doc_ids.append(f"metadata_overview_{file_name}")

        # Column details
        for col_info in dataframe_info.get('column_details', []):
            col_doc = (
                f"Column {col_info['name']}: Type {col_info['dtype']}, "
                f"Non-null {col_info['non_null_count']}, Unique {col_info['unique_count']}, "
                f"Null percentage {col_info['null_percentage']}%"
            )
            metadata_docs.append(col_doc)
            doc_ids.append(f"column_{col_info['name']}")

        if metadata_docs:
            print(f"[RAG] Embedding {len(metadata_docs)} metadata documents for session {session_id}")
            collection.add(
                ids=doc_ids,
                documents=metadata_docs,
                metadatas=[{"type": "metadata", "file": file_name} for _ in metadata_docs]
            )
            print(f"[RAG] Metadata embedded. Collection has {collection.count()} documents")

    def embed_analysis_results(
        self,
        session_id: str,
        analysis: Dict[str, Any],
        file_name: str
    ) -> None:
        """Embed analysis results into the vector store.

        Args:
            session_id: Unique session identifier
            analysis: Complete analysis results from analysis pipeline
            file_name: Original file name
        """
        collection = self.get_collection(session_id)
        if not collection:
            collection = self.create_session_collection(session_id)

        docs = []
        doc_ids = []
        metadatas = []

        # Embed data quality insights
        if "data_quality" in analysis:
            quality = analysis["data_quality"]
            quality_doc = f"Data quality assessment: {json.dumps(quality, default=str)}"
            docs.append(quality_doc)
            doc_ids.append(f"quality_{file_name}")
            metadatas.append({"type": "quality", "file": file_name})

        # Embed pandas describe (comprehensive stats)
        if "pandas_describe" in analysis:
            pd_desc = analysis["pandas_describe"]
            # Numeric describe
            if "numeric" in pd_desc and pd_desc["numeric"]:
                desc_doc = f"Pandas describe() for numeric columns: {json.dumps(pd_desc['numeric'], default=str)}"
                docs.append(desc_doc)
                doc_ids.append(f"pandas_describe_numeric_{file_name}")
                metadatas.append({"type": "statistics", "subtype": "pandas_describe", "file": file_name})
            # Categorical describe
            if "categorical" in pd_desc and pd_desc["categorical"]:
                desc_doc = f"Pandas describe() for categorical columns: {json.dumps(pd_desc['categorical'], default=str)}"
                docs.append(desc_doc)
                doc_ids.append(f"pandas_describe_categorical_{file_name}")
                metadatas.append({"type": "statistics", "subtype": "pandas_describe", "file": file_name})

        # Embed categorical statistics
        if "categorical_stats" in analysis:
            for col_name, cat_stats in analysis["categorical_stats"].items():
                cat_doc = f"Categorical statistics for {col_name}: unique={cat_stats.get('unique_count')}, most_common='{cat_stats.get('most_common')}' ({cat_stats.get('most_common_percentage', 0):.1f}%), value_counts={json.dumps(cat_stats.get('value_counts', {}), default=str)}"
                docs.append(cat_doc)
                doc_ids.append(f"categorical_stats_{col_name}")
                metadatas.append({"type": "statistics", "subtype": "categorical", "column": col_name, "file": file_name})

        # Embed descriptive statistics
        if "descriptive_stats" in analysis:
            for col_name, stats in analysis["descriptive_stats"].items():
                stats_doc = f"Statistics for {col_name}: {json.dumps(stats, default=str)}"
                docs.append(stats_doc)
                doc_ids.append(f"stats_{col_name}")
                metadatas.append({"type": "statistics", "column": col_name, "file": file_name})

        # Embed correlation information
        if "correlations" in analysis and analysis["correlations"]:
            corr_doc = f"Correlation analysis: {json.dumps(analysis['correlations'], default=str)}"
            docs.append(corr_doc)
            doc_ids.append(f"correlations_{file_name}")
            metadatas.append({"type": "correlations", "file": file_name})

        # Embed outlier information
        if "outliers" in analysis and analysis["outliers"]:
            for col_name, outlier_info in analysis["outliers"].items():
                outlier_doc = f"Outliers detected in {col_name}: {json.dumps(outlier_info, default=str)}"
                docs.append(outlier_doc)
                doc_ids.append(f"outliers_{col_name}")
                metadatas.append({"type": "outliers", "column": col_name, "file": file_name})

        # Embed insights
        if "insights" in analysis and analysis["insights"]:
            insights = analysis["insights"]
            for category in ["data_quality", "distributions", "relationships", "patterns", "anomalies"]:
                if category in insights and insights[category]:
                    insights_list = insights[category]
                    if isinstance(insights_list, list):
                        for i, insight in enumerate(insights_list):
                            insight_doc = f"{category.replace('_', ' ').title()}: {json.dumps(insight, default=str)}"
                            docs.append(insight_doc)
                            doc_ids.append(f"insight_{category}_{i}")
                            metadatas.append({"type": "insight", "category": category, "file": file_name})

            # Key findings
            if "key_findings" in insights and insights["key_findings"]:
                for i, finding in enumerate(insights["key_findings"]):
                    finding_doc = f"Key finding: {json.dumps(finding, default=str)}"
                    docs.append(finding_doc)
                    doc_ids.append(f"finding_{i}")
                    metadatas.append({"type": "finding", "file": file_name})

            # Recommendations
            if "recommendations" in insights and insights["recommendations"]:
                for i, rec in enumerate(insights["recommendations"]):
                    rec_doc = f"Recommendation: {json.dumps(rec, default=str)}"
                    docs.append(rec_doc)
                    doc_ids.append(f"recommendation_{i}")
                    metadatas.append({"type": "recommendation", "file": file_name})

        if docs:
            print(f"[RAG] Embedding {len(docs)} analysis documents for session {session_id}")
            collection.add(
                ids=doc_ids,
                documents=docs,
                metadatas=metadatas
            )
            print(f"[RAG] Successfully embedded. Collection now has {collection.count()} total documents")

    def embed_visualizations(
        self,
        session_id: str,
        visualizations: Dict[str, str],
        file_name: str
    ) -> None:
        """Embed visualization information into the vector store.

        Args:
            session_id: Unique session identifier
            visualizations: Dictionary mapping viz type to file path
            file_name: Original file name
        """
        collection = self.get_collection(session_id)
        if not collection:
            collection = self.create_session_collection(session_id)

        if not visualizations:
            return

        docs = []
        doc_ids = []
        metadatas = []

        # Get backend URL for visualization paths (for frontend access)
        backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")

        # Create a summary of all available visualizations
        viz_list = []
        for viz_type, viz_path in visualizations.items():
            # Extract just the filename from the path
            viz_filename = os.path.basename(viz_path)
            viz_list.append(f"- {viz_type}: {backend_url}/visualizations/{session_id}/{viz_filename}")

        viz_summary = f"Available visualizations for {file_name}:\n" + "\n".join(viz_list)
        docs.append(viz_summary)
        doc_ids.append(f"visualizations_summary_{file_name}")
        metadatas.append({"type": "visualization", "subtype": "summary", "file": file_name})

        # Embed individual visualization info
        for viz_type, viz_path in visualizations.items():
            viz_filename = os.path.basename(viz_path)
            viz_url = f"{backend_url}/visualizations/{session_id}/{viz_filename}"

            # Create descriptive text for each visualization
            viz_desc = f"Visualization '{viz_type}' for {file_name}. "
            if "distribution" in viz_type:
                col_name = viz_type.replace("distribution_", "")
                viz_desc += f"Shows the distribution/histogram of column '{col_name}'. "
            elif "correlation" in viz_type:
                viz_desc += "Shows correlation matrix heatmap between numeric variables. "
            elif "boxplot" in viz_type:
                viz_desc += "Shows box plots for outlier detection across numeric columns. "
            elif "categorical" in viz_type:
                col_name = viz_type.replace("categorical_", "")
                viz_desc += f"Shows bar chart of category frequencies for '{col_name}'. "

            viz_desc += f"URL: {viz_url}"

            docs.append(viz_desc)
            doc_ids.append(f"viz_{viz_type}_{file_name}")
            metadatas.append({
                "type": "visualization",
                "subtype": viz_type,
                "file": file_name,
                "url": viz_url
            })

        if docs:
            print(f"[RAG] Embedding {len(docs)} visualization documents for session {session_id}")
            collection.add(
                ids=doc_ids,
                documents=docs,
                metadatas=metadatas
            )
            print(f"[RAG] Visualizations embedded. Collection now has {collection.count()} total documents")

    def store_conversation(
        self,
        session_id: str,
        user_message: str,
        assistant_response: str,
        turn_number: int
    ) -> None:
        """Store conversation turn in vector store for semantic memory.

        Args:
            session_id: Unique session identifier
            user_message: User's question/message
            assistant_response: Assistant's response
            turn_number: Conversation turn number
        """
        collection = self.get_collection(session_id)
        if not collection:
            collection = self.create_session_collection(session_id)

        docs = []
        doc_ids = []
        metadatas = []

        # Store user message
        docs.append(f"User question (turn {turn_number}): {user_message}")
        doc_ids.append(f"user_turn_{turn_number}")
        metadatas.append({"type": "conversation", "role": "user", "turn": turn_number})

        # Store assistant response
        docs.append(f"Assistant response (turn {turn_number}): {assistant_response}")
        doc_ids.append(f"assistant_turn_{turn_number}")
        metadatas.append({"type": "conversation", "role": "assistant", "turn": turn_number})

        collection.add(
            ids=doc_ids,
            documents=docs,
            metadatas=metadatas
        )

    def retrieve_context(
        self,
        session_id: str,
        query: str,
        top_k: int = 10,
        include_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve relevant context for a query using semantic search.

        Args:
            session_id: Unique session identifier
            query: User query or context to search
            top_k: Number of top results to return
            include_types: Filter by document type (metadata, statistics, insight, conversation, etc.)

        Returns:
            List of retrieved documents with metadata
        """
        collection = self.get_collection(session_id)
        if not collection:
            print(f"[RAG] No collection found for session {session_id}")
            return []

        try:
            doc_count = collection.count()
            print(f"[RAG] Retrieving from collection with {doc_count} documents")

            where_filter = None
            if include_types:
                where_filter = {"type": {"$in": include_types}}

            results = collection.query(
                query_texts=[query],
                n_results=top_k,
                where=where_filter,
                include=["documents", "metadatas", "distances"]
            )

            # Debug: Check results structure
            print(f"[RAG] Raw results keys: {results.keys() if results else 'None'}")

            if not results.get("documents") or len(results["documents"]) == 0:
                print(f"[RAG] No documents in results")
                return []

            if len(results["documents"][0]) == 0:
                print(f"[RAG] Documents list is empty")
                return []

            print(f"[RAG] Query returned {len(results['documents'][0])} results")

            # Format results with safe access
            retrieved = []
            documents = results["documents"][0]
            metadatas = results.get("metadatas", [[]])[0] if results.get("metadatas") else []
            distances = results.get("distances", [[]])[0] if results.get("distances") else []

            for i, doc in enumerate(documents):
                retrieved.append({
                    "document": doc,
                    "metadata": metadatas[i] if i < len(metadatas) else {},
                    "distance": distances[i] if i < len(distances) else 0
                })

            print(f"[RAG] Returning {len(retrieved)} formatted documents")
            return retrieved

        except Exception as e:
            import traceback
            print(f"[RAG] Error retrieving context: {e}")
            print(traceback.format_exc())
            return []

    def delete_collection(self, session_id: str) -> bool:
        """Delete a session's collection (for session cleanup).

        Args:
            session_id: Unique session identifier

        Returns:
            True if successful, False otherwise
        """
        try:
            collection_name = f"session_{session_id}".replace("-", "_")
            self.client.delete_collection(name=collection_name)

            if session_id in self.active_collections:
                del self.active_collections[session_id]

            return True
        except Exception as e:
            print(f"Error deleting collection for session {session_id}: {e}")
            return False

    def get_collection_stats(self, session_id: str) -> Dict[str, Any]:
        """Get statistics about a session's collection.

        Args:
            session_id: Unique session identifier

        Returns:
            Dictionary with collection statistics
        """
        collection = self.get_collection(session_id)
        if not collection:
            return {}

        try:
            count = collection.count()
            return {
                "session_id": session_id,
                "total_documents": count,
                "collection_name": f"session_{session_id}"
            }
        except Exception as e:
            print(f"Error getting collection stats: {e}")
            return {}

    def embed_pdf_content(
        self,
        session_id: str,
        file_name: str,
        pdf_data: Dict[str, Any],
        chunk_size: int = 1000
    ) -> None:
        """Embed PDF content into the vector store.

        Args:
            session_id: Unique session identifier
            file_name: Original PDF file name
            pdf_data: Extracted PDF data from FileHandler
            chunk_size: Maximum characters per chunk for embedding
        """
        collection = self.get_collection(session_id)
        if not collection:
            collection = self.create_session_collection(session_id)

        docs = []
        doc_ids = []
        metadatas = []

        # Embed PDF metadata/overview
        metadata = pdf_data.get("metadata", {})
        num_pages = metadata.get("num_pages", len(pdf_data.get("pages", [])))
        total_chars = pdf_data.get("total_chars", 0)

        overview = (
            f"PDF Document: {file_name}. "
            f"Pages: {num_pages}. "
            f"Total characters: {total_chars}. "
            f"Type: Research paper/document."
        )
        docs.append(overview)
        doc_ids.append(f"pdf_overview_{file_name}")
        metadatas.append({"type": "pdf_metadata", "file": file_name})

        # Embed page-by-page content
        pages = pdf_data.get("text_content", pdf_data.get("pages", []))
        for page_info in pages:
            page_num = page_info.get("page", 0)
            page_text = page_info.get("text", "")

            if not page_text.strip():
                continue

            # Chunk large pages
            if len(page_text) > chunk_size:
                chunks = [page_text[i:i+chunk_size] for i in range(0, len(page_text), chunk_size)]
                for chunk_idx, chunk in enumerate(chunks):
                    docs.append(f"[Page {page_num}, Part {chunk_idx+1}] {chunk}")
                    doc_ids.append(f"pdf_{file_name}_page{page_num}_chunk{chunk_idx}")
                    metadatas.append({
                        "type": "pdf_content",
                        "file": file_name,
                        "page": page_num,
                        "chunk": chunk_idx
                    })
            else:
                docs.append(f"[Page {page_num}] {page_text}")
                doc_ids.append(f"pdf_{file_name}_page{page_num}")
                metadatas.append({
                    "type": "pdf_content",
                    "file": file_name,
                    "page": page_num
                })

        # Embed full text as searchable summary (truncated if too long)
        full_text = pdf_data.get("full_text", "")
        if full_text:
            # Create a summary chunk for general queries
            summary_text = full_text[:2000] if len(full_text) > 2000 else full_text
            docs.append(f"PDF Summary ({file_name}): {summary_text}")
            doc_ids.append(f"pdf_summary_{file_name}")
            metadatas.append({"type": "pdf_summary", "file": file_name})

        # Embed section information if available
        sections = pdf_data.get("has_sections", {})
        if sections:
            section_list = [s for s, present in sections.items() if present]
            if section_list:
                section_doc = f"Document sections in {file_name}: {', '.join(section_list)}"
                docs.append(section_doc)
                doc_ids.append(f"pdf_sections_{file_name}")
                metadatas.append({"type": "pdf_sections", "file": file_name})

        if docs:
            print(f"[RAG] Embedding {len(docs)} PDF documents for session {session_id}")
            collection.add(
                ids=doc_ids,
                documents=docs,
                metadatas=metadatas
            )
            print(f"[RAG] PDF content embedded. Collection now has {collection.count()} total documents")

    def embed_text_content(
        self,
        session_id: str,
        file_name: str,
        text_content: str,
        chunk_size: int = 1000
    ) -> None:
        """Embed plain text file content into the vector store.

        Args:
            session_id: Unique session identifier
            file_name: Original text file name
            text_content: Text content of the file
            chunk_size: Maximum characters per chunk for embedding
        """
        collection = self.get_collection(session_id)
        if not collection:
            collection = self.create_session_collection(session_id)

        docs = []
        doc_ids = []
        metadatas = []

        # Embed file overview
        overview = (
            f"Text Document: {file_name}. "
            f"Total characters: {len(text_content)}. "
            f"Type: Plain text file."
        )
        docs.append(overview)
        doc_ids.append(f"text_overview_{file_name}")
        metadatas.append({"type": "text_metadata", "file": file_name})

        # Chunk and embed content
        if len(text_content) > chunk_size:
            chunks = [text_content[i:i+chunk_size] for i in range(0, len(text_content), chunk_size)]
            for chunk_idx, chunk in enumerate(chunks):
                docs.append(f"[{file_name} - Part {chunk_idx+1}] {chunk}")
                doc_ids.append(f"text_{file_name}_chunk{chunk_idx}")
                metadatas.append({
                    "type": "text_content",
                    "file": file_name,
                    "chunk": chunk_idx
                })
        else:
            docs.append(f"[{file_name}] {text_content}")
            doc_ids.append(f"text_{file_name}_content")
            metadatas.append({"type": "text_content", "file": file_name})

        if docs:
            print(f"[RAG] Embedding {len(docs)} text documents for session {session_id}")
            collection.add(
                ids=doc_ids,
                documents=docs,
                metadatas=metadatas
            )
            print(f"[RAG] Text content embedded. Collection now has {collection.count()} total documents")

    def embed_json_content(
        self,
        session_id: str,
        file_name: str,
        json_data: Any,
        chunk_size: int = 1000
    ) -> None:
        """Embed JSON file content into the vector store.

        Args:
            session_id: Unique session identifier
            file_name: Original JSON file name
            json_data: Parsed JSON data (dict or list)
            chunk_size: Maximum characters per chunk for embedding
        """
        collection = self.get_collection(session_id)
        if not collection:
            collection = self.create_session_collection(session_id)

        docs = []
        doc_ids = []
        metadatas = []

        # Determine JSON structure
        if isinstance(json_data, dict):
            keys = list(json_data.keys())
            structure = f"Object with {len(keys)} keys: {', '.join(keys[:10])}"
            if len(keys) > 10:
                structure += f"... and {len(keys) - 10} more"
        elif isinstance(json_data, list):
            structure = f"Array with {len(json_data)} items"
        else:
            structure = f"Value of type {type(json_data).__name__}"

        # Embed file overview
        overview = (
            f"JSON Document: {file_name}. "
            f"Structure: {structure}. "
            f"Type: JSON data file."
        )
        docs.append(overview)
        doc_ids.append(f"json_overview_{file_name}")
        metadatas.append({"type": "json_metadata", "file": file_name})

        # Convert to string for embedding
        json_str = json.dumps(json_data, indent=2, default=str)

        # Chunk and embed content
        if len(json_str) > chunk_size:
            chunks = [json_str[i:i+chunk_size] for i in range(0, len(json_str), chunk_size)]
            for chunk_idx, chunk in enumerate(chunks):
                docs.append(f"[{file_name} - Part {chunk_idx+1}] {chunk}")
                doc_ids.append(f"json_{file_name}_chunk{chunk_idx}")
                metadatas.append({
                    "type": "json_content",
                    "file": file_name,
                    "chunk": chunk_idx
                })
        else:
            docs.append(f"[{file_name}] {json_str}")
            doc_ids.append(f"json_{file_name}_content")
            metadatas.append({"type": "json_content", "file": file_name})

        # For dict, also embed key-value pairs as separate searchable docs
        if isinstance(json_data, dict):
            for key, value in json_data.items():
                value_str = json.dumps(value, default=str) if not isinstance(value, str) else value
                if len(value_str) > 500:
                    value_str = value_str[:500] + "..."
                kv_doc = f"JSON key '{key}' in {file_name}: {value_str}"
                docs.append(kv_doc)
                doc_ids.append(f"json_{file_name}_key_{key}")
                metadatas.append({
                    "type": "json_key",
                    "file": file_name,
                    "key": key
                })

        if docs:
            print(f"[RAG] Embedding {len(docs)} JSON documents for session {session_id}")
            collection.add(
                ids=doc_ids,
                documents=docs,
                metadatas=metadatas
            )
            print(f"[RAG] JSON content embedded. Collection now has {collection.count()} total documents")

    # ==================== TRIAL-BASED METHODS ====================

    def create_trial_collection(self, trial_name: str) -> chromadb.Collection:
        """Create or get a ChromaDB collection for a trial (shared across sessions).

        Args:
            trial_name: Name of the trial

        Returns:
            ChromaDB collection for this trial
        """
        # Sanitize collection name - only allow alphanumeric, underscore, hyphen
        sanitized = re.sub(r'[^a-zA-Z0-9_-]', '_', trial_name)
        collection_name = f"trial_{sanitized}"

        try:
            collection = self.client.get_or_create_collection(
                name=collection_name,
                metadata={"trial_name": trial_name, "type": "trial", "created_at": datetime.now().isoformat()}
            )
            self.trial_collections[trial_name] = collection
            return collection
        except Exception as e:
            print(f"[RAG] Error creating trial collection for '{trial_name}': {e}")
            raise

    def get_trial_collection(self, trial_name: str) -> Optional[chromadb.Collection]:
        """Get existing collection for a trial.

        Args:
            trial_name: Name of the trial

        Returns:
            ChromaDB collection or None if not found
        """
        if trial_name in self.trial_collections:
            return self.trial_collections[trial_name]

        try:
            sanitized = re.sub(r'[^a-zA-Z0-9_-]', '_', trial_name)
            collection_name = f"trial_{sanitized}"
            collection = self.client.get_collection(name=collection_name)
            self.trial_collections[trial_name] = collection
            return collection
        except Exception as e:
            print(f"[RAG] Trial collection not found for '{trial_name}': {e}")
            return None

    def embed_trial_dataset(
        self,
        trial_name: str,
        file_name: str,
        analysis: Dict[str, Any]
    ) -> None:
        """Embed analysis results for a trial dataset into the trial collection.

        Args:
            trial_name: Name of the trial
            file_name: Original file name
            analysis: Complete analysis results from analysis pipeline
        """
        collection = self.get_trial_collection(trial_name)
        if not collection:
            collection = self.create_trial_collection(trial_name)

        docs = []
        doc_ids = []
        metadatas = []

        # Prefix for document IDs to enable per-file removal
        prefix = f"{file_name}_"

        # Embed dataframe info / metadata
        if "dataframe_info" in analysis:
            df_info = analysis["dataframe_info"]
            overview = (
                f"Dataset: {file_name} (Trial: {trial_name}). "
                f"Shape: {df_info.get('num_rows', 'N/A')} rows, {df_info.get('num_columns', 'N/A')} columns. "
                f"Numeric columns: {', '.join(df_info.get('numeric_columns', []))}. "
                f"Categorical columns: {', '.join(df_info.get('categorical_columns', []))}"
            )
            docs.append(overview)
            doc_ids.append(f"{prefix}metadata_overview")
            metadatas.append({"type": "metadata", "file": file_name, "trial": trial_name})

            # Column details
            for col_info in df_info.get('column_details', []):
                col_doc = (
                    f"Column {col_info['name']} in {file_name}: Type {col_info['dtype']}, "
                    f"Non-null {col_info['non_null_count']}, Unique {col_info['unique_count']}, "
                    f"Null percentage {col_info['null_percentage']}%"
                )
                docs.append(col_doc)
                doc_ids.append(f"{prefix}column_{col_info['name']}")
                metadatas.append({"type": "metadata", "file": file_name, "trial": trial_name, "column": col_info['name']})

        # Embed data quality insights
        if "data_quality" in analysis:
            quality = analysis["data_quality"]
            quality_doc = f"Data quality for {file_name} (Trial: {trial_name}): {json.dumps(quality, default=str)}"
            docs.append(quality_doc)
            doc_ids.append(f"{prefix}quality")
            metadatas.append({"type": "quality", "file": file_name, "trial": trial_name})

        # Embed pandas describe
        if "pandas_describe" in analysis:
            pd_desc = analysis["pandas_describe"]
            if "numeric" in pd_desc and pd_desc["numeric"]:
                desc_doc = f"Statistics for {file_name} (numeric columns): {json.dumps(pd_desc['numeric'], default=str)}"
                docs.append(desc_doc)
                doc_ids.append(f"{prefix}pandas_describe_numeric")
                metadatas.append({"type": "statistics", "subtype": "pandas_describe", "file": file_name, "trial": trial_name})
            if "categorical" in pd_desc and pd_desc["categorical"]:
                desc_doc = f"Statistics for {file_name} (categorical columns): {json.dumps(pd_desc['categorical'], default=str)}"
                docs.append(desc_doc)
                doc_ids.append(f"{prefix}pandas_describe_categorical")
                metadatas.append({"type": "statistics", "subtype": "pandas_describe", "file": file_name, "trial": trial_name})

        # Embed categorical statistics
        if "categorical_stats" in analysis:
            for col_name, cat_stats in analysis["categorical_stats"].items():
                cat_doc = f"Categorical stats for {col_name} in {file_name}: unique={cat_stats.get('unique_count')}, most_common='{cat_stats.get('most_common')}' ({cat_stats.get('most_common_percentage', 0):.1f}%)"
                docs.append(cat_doc)
                doc_ids.append(f"{prefix}categorical_stats_{col_name}")
                metadatas.append({"type": "statistics", "subtype": "categorical", "column": col_name, "file": file_name, "trial": trial_name})

        # Embed descriptive statistics
        if "descriptive_stats" in analysis:
            for col_name, stats in analysis["descriptive_stats"].items():
                stats_doc = f"Descriptive stats for {col_name} in {file_name}: {json.dumps(stats, default=str)}"
                docs.append(stats_doc)
                doc_ids.append(f"{prefix}stats_{col_name}")
                metadatas.append({"type": "statistics", "column": col_name, "file": file_name, "trial": trial_name})

        # Embed correlation information
        if "correlations" in analysis and analysis["correlations"]:
            corr_doc = f"Correlation analysis for {file_name}: {json.dumps(analysis['correlations'], default=str)}"
            docs.append(corr_doc)
            doc_ids.append(f"{prefix}correlations")
            metadatas.append({"type": "correlations", "file": file_name, "trial": trial_name})

        # Embed outlier information
        if "outliers" in analysis and analysis["outliers"]:
            for col_name, outlier_info in analysis["outliers"].items():
                outlier_doc = f"Outliers in {col_name} ({file_name}): {json.dumps(outlier_info, default=str)}"
                docs.append(outlier_doc)
                doc_ids.append(f"{prefix}outliers_{col_name}")
                metadatas.append({"type": "outliers", "column": col_name, "file": file_name, "trial": trial_name})

        # Embed insights
        if "insights" in analysis and analysis["insights"]:
            insights = analysis["insights"]
            for category in ["data_quality", "distributions", "relationships", "patterns", "anomalies"]:
                if category in insights and insights[category]:
                    insights_list = insights[category]
                    if isinstance(insights_list, list):
                        for i, insight in enumerate(insights_list):
                            insight_doc = f"{category.replace('_', ' ').title()} insight for {file_name}: {json.dumps(insight, default=str)}"
                            docs.append(insight_doc)
                            doc_ids.append(f"{prefix}insight_{category}_{i}")
                            metadatas.append({"type": "insight", "category": category, "file": file_name, "trial": trial_name})

            # Key findings
            if "key_findings" in insights and insights["key_findings"]:
                for i, finding in enumerate(insights["key_findings"]):
                    finding_doc = f"Key finding for {file_name}: {json.dumps(finding, default=str)}"
                    docs.append(finding_doc)
                    doc_ids.append(f"{prefix}finding_{i}")
                    metadatas.append({"type": "finding", "file": file_name, "trial": trial_name})

            # Recommendations
            if "recommendations" in insights and insights["recommendations"]:
                for i, rec in enumerate(insights["recommendations"]):
                    rec_doc = f"Recommendation for {file_name}: {json.dumps(rec, default=str)}"
                    docs.append(rec_doc)
                    doc_ids.append(f"{prefix}recommendation_{i}")
                    metadatas.append({"type": "recommendation", "file": file_name, "trial": trial_name})

        if docs:
            print(f"[RAG] Embedding {len(docs)} trial documents for '{trial_name}' / {file_name}")
            collection.add(
                ids=doc_ids,
                documents=docs,
                metadatas=metadatas
            )
            print(f"[RAG] Trial dataset embedded. Collection now has {collection.count()} total documents")

    def remove_file_from_trial(self, trial_name: str, file_name: str) -> bool:
        """Remove all embeddings for a specific file from the trial collection.

        Args:
            trial_name: Name of the trial
            file_name: File name to remove embeddings for

        Returns:
            True if successful, False otherwise
        """
        collection = self.get_trial_collection(trial_name)
        if not collection:
            print(f"[RAG] Trial collection not found for '{trial_name}'")
            return False

        try:
            # Query documents with matching file metadata
            results = collection.get(where={"file": file_name})
            if results and results["ids"]:
                collection.delete(ids=results["ids"])
                print(f"[RAG] Removed {len(results['ids'])} documents for '{file_name}' from trial '{trial_name}'")
                return True
            else:
                print(f"[RAG] No documents found for '{file_name}' in trial '{trial_name}'")
                return True
        except Exception as e:
            print(f"[RAG] Error removing file from trial: {e}")
            return False

    def retrieve_trial_context(
        self,
        trial_name: str,
        query: str,
        top_k: int = 15,
        include_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve relevant context from a trial collection using semantic search.

        Args:
            trial_name: Name of the trial
            query: User query to search for
            top_k: Number of top results to return
            include_types: Filter by document type

        Returns:
            List of retrieved documents with metadata
        """
        collection = self.get_trial_collection(trial_name)
        if not collection:
            print(f"[RAG] No trial collection found for '{trial_name}'")
            return []

        try:
            doc_count = collection.count()
            print(f"[RAG] Retrieving from trial '{trial_name}' collection with {doc_count} documents")

            where_filter = None
            if include_types:
                where_filter = {"type": {"$in": include_types}}

            results = collection.query(
                query_texts=[query],
                n_results=top_k,
                where=where_filter,
                include=["documents", "metadatas", "distances"]
            )

            if not results.get("documents") or len(results["documents"]) == 0:
                print(f"[RAG] No documents in trial results")
                return []

            if len(results["documents"][0]) == 0:
                print(f"[RAG] Trial documents list is empty")
                return []

            print(f"[RAG] Trial query returned {len(results['documents'][0])} results")

            # Format results
            retrieved = []
            documents = results["documents"][0]
            metadatas = results.get("metadatas", [[]])[0] if results.get("metadatas") else []
            distances = results.get("distances", [[]])[0] if results.get("distances") else []

            for i, doc in enumerate(documents):
                retrieved.append({
                    "document": doc,
                    "metadata": metadatas[i] if i < len(metadatas) else {},
                    "distance": distances[i] if i < len(distances) else 0
                })

            return retrieved

        except Exception as e:
            import traceback
            print(f"[RAG] Error retrieving trial context: {e}")
            print(traceback.format_exc())
            return []

    def list_available_trials(self) -> List[str]:
        """List all trial collections available in ChromaDB.

        Returns:
            List of trial names
        """
        try:
            collections = self.client.list_collections()
            trials = []
            for collection in collections:
                if collection.name.startswith("trial_"):
                    # Extract trial name by removing "trial_" prefix
                    trial_name = collection.name[6:]  # len("trial_") = 6
                    trials.append(trial_name)
            return sorted(trials)
        except Exception as e:
            print(f"[RAG] Error listing trial collections: {e}")
            return []

    def get_trial_collection_stats(self, trial_name: str) -> Dict[str, Any]:
        """Get statistics about a trial's collection.

        Args:
            trial_name: Name of the trial

        Returns:
            Dictionary with collection statistics
        """
        collection = self.get_trial_collection(trial_name)
        if not collection:
            return {"trial_name": trial_name, "exists": False, "total_documents": 0}

        try:
            count = collection.count()
            return {
                "trial_name": trial_name,
                "exists": True,
                "total_documents": count,
                "collection_name": f"trial_{trial_name}"
            }
        except Exception as e:
            print(f"[RAG] Error getting trial collection stats: {e}")
            return {"trial_name": trial_name, "exists": False, "error": str(e)}

    def delete_trial_collection(self, trial_name: str) -> bool:
        """Delete a trial's collection (for cleanup).

        Args:
            trial_name: Name of the trial

        Returns:
            True if successful, False otherwise
        """
        try:
            collection_name = f"trial_{trial_name}".replace("-", "_").replace(" ", "_").replace(".", "_")
            self.client.delete_collection(name=collection_name)

            if trial_name in self.trial_collections:
                del self.trial_collections[trial_name]

            print(f"[RAG] Deleted trial collection for '{trial_name}'")
            return True
        except Exception as e:
            print(f"[RAG] Error deleting trial collection for '{trial_name}': {e}")
            return False
