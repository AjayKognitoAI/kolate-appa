"""
Example usage of the Code Execution Agent system.

This example demonstrates:
1. Basic query processing
2. Multi-file analysis
3. Custom code execution
4. File listing and metadata retrieval
"""
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from data_science_agent.code_execution_agent import CodeExecutionOrchestrator


def main():
    """Run example queries."""
    # Set API key (or use GOOGLE_API_KEY environment variable)
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("Error: GOOGLE_API_KEY environment variable not set")
        return

    # Initialize orchestrator
    print("Initializing Code Execution Orchestrator...")
    orchestrator = CodeExecutionOrchestrator(api_key=api_key)
    print("✓ Initialized\n")

    # Example 1: List available files
    print("=" * 60)
    print("Example 1: List Available Files")
    print("=" * 60)

    files_info = orchestrator.get_available_files()
    print(f"\nFound {files_info['count']} files:")
    print(f"Total size: {files_info['total_size_mb']} MB")
    print(f"Sources: {files_info['sources']}")

    if files_info['files']:
        print("\nFirst 5 files:")
        for file in files_info['files'][:5]:
            print(f"  - {file['file_name']} ({round(file['file_size']/(1024*1024), 2)} MB)")
            print(f"    Path: {file['file_path']}")
            print(f"    Source: {file['source']}")
    else:
        print("\nNo files found. Make sure:")
        print("  1. S3_BUCKET_NAME is set")
        print("  2. Local files are in ./data/uploads/")
        print("\nSkipping remaining examples...")
        return

    # Example 2: Get file metadata
    print("\n" + "=" * 60)
    print("Example 2: Get File Metadata")
    print("=" * 60)

    if files_info['files']:
        sample_file = files_info['files'][0]
        print(f"\nGetting metadata for: {sample_file['file_name']}")

        metadata = orchestrator.get_file_info(sample_file['file_path'])
        print(f"\nFile: {metadata.get('file_name')}")
        print(f"Size: {metadata.get('file_size_mb')} MB")
        print(f"Rows: {metadata.get('num_rows')}")
        print(f"Columns: {metadata.get('num_columns')}")
        print(f"Column names: {metadata.get('column_names', [])[:10]}")  # First 10

        if 'sample_data' in metadata:
            print(f"\nSample data (first 3 rows):")
            for i, row in enumerate(metadata['sample_data'][:3], 1):
                print(f"  Row {i}: {list(row.values())[:5]}")  # First 5 values

    # Example 3: Simple analysis query
    print("\n" + "=" * 60)
    print("Example 3: Simple Analysis Query")
    print("=" * 60)

    query = "What are the column names and basic statistics of the dataset?"
    print(f"\nQuery: {query}")

    result = orchestrator.process_query(query=query)

    print(f"\nSuccess: {result['success']}")
    print(f"Plots generated: {len(result['plots'])}")
    print(f"\n{'-' * 60}")
    print("Response:")
    print(f"{'-' * 60}")
    print(result['response'])

    # Show metadata
    if result['metadata'].get('workflow'):
        print(f"\n{'-' * 60}")
        print("Workflow Summary:")
        print(f"{'-' * 60}")
        for step in result['metadata']['workflow']:
            print(f"  {step['step']}: {step}")

    # Example 4: Correlation analysis
    print("\n" + "=" * 60)
    print("Example 4: Correlation Analysis")
    print("=" * 60)

    query = "Calculate correlations between numerical variables and show the top 5 strongest correlations"
    print(f"\nQuery: {query}")

    result = orchestrator.process_query(query=query)

    print(f"\nSuccess: {result['success']}")
    print(f"Plots generated: {len(result['plots'])}")
    if result['plots']:
        print("Plot files:")
        for plot in result['plots']:
            print(f"  - {plot}")

    print(f"\n{'-' * 60}")
    print("Response:")
    print(f"{'-' * 60}")
    print(result['response'])

    # Example 5: Custom code execution
    print("\n" + "=" * 60)
    print("Example 5: Custom Code Execution")
    print("=" * 60)

    if files_info['files']:
        custom_code = """
# Custom analysis: Count missing values
print("Analyzing missing values...")

missing_counts = df.isnull().sum()
missing_pct = (df.isnull().sum() / len(df)) * 100

# Create summary
missing_summary = pd.DataFrame({
    'column': missing_counts.index,
    'missing_count': missing_counts.values,
    'missing_pct': missing_pct.values
}).sort_values('missing_count', ascending=False)

print("\\nTop 10 columns with missing values:")
print(missing_summary.head(10))

# Visualize
import matplotlib.pyplot as plt
top_10 = missing_summary.head(10)
if len(top_10) > 0:
    plt.figure(figsize=(10, 6))
    plt.barh(top_10['column'], top_10['missing_pct'])
    plt.xlabel('Missing %')
    plt.title('Top 10 Columns with Missing Values')
    plt.tight_layout()

result = missing_summary.to_dict(orient='records')
"""

        print("Executing custom code:")
        print(custom_code[:200] + "...")

        file_path = files_info['files'][0]['file_path']
        result = orchestrator.process_query_with_custom_code(
            code=custom_code,
            file_paths={"df": file_path},
            query="Analyze missing values in the dataset"
        )

        print(f"\nSuccess: {result['success']}")
        print(f"Plots generated: {len(result['plots'])}")
        print(f"\n{'-' * 60}")
        print("Response:")
        print(f"{'-' * 60}")
        print(result['response'])

    # Example 6: Trial-specific analysis
    print("\n" + "=" * 60)
    print("Example 6: Trial-Specific Analysis")
    print("=" * 60)

    # Get unique trial names
    trial_names = set(f.get('trial_name') for f in files_info['files'] if f.get('trial_name'))

    if trial_names:
        trial_name = list(trial_names)[0]
        query = f"Summarize the data available in {trial_name}"
        print(f"\nQuery: {query}")

        result = orchestrator.process_query(
            query=query,
            trial_name=trial_name
        )

        print(f"\nSuccess: {result['success']}")
        print(f"\n{'-' * 60}")
        print("Response:")
        print(f"{'-' * 60}")
        print(result['response'])
    else:
        print("\nNo trial-specific files found (skipping)")

    print("\n" + "=" * 60)
    print("Examples Complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("  1. Review generated code in metadata['generated_code']")
    print("  2. Check visualizations in ./data/visualizations/")
    print("  3. Modify config.py to customize behavior")
    print("  4. Integrate with your API (see integration_example.py)")


if __name__ == "__main__":
    main()
