"""Research paper analysis tools."""

import json
import re
from typing import Dict, Any, List, Optional

from data_science_agent.shared_libraries import FileHandler


# Cache for parsed papers
_paper_cache: Dict[str, Dict[str, Any]] = {}


def parse_research_paper(file_path: str) -> str:
    """
    Parse a research paper PDF and extract text content.

    Args:
        file_path: Path to the PDF file

    Returns:
        JSON string with extracted content and metadata
    """
    try:
        file_handler = FileHandler()

        # Parse the research paper
        paper_data = file_handler.parse_research_paper(file_path)

        if 'error' in paper_data:
            return json.dumps({"status": "error", "message": paper_data['error']})

        # Cache the parsed paper
        _paper_cache[file_path] = paper_data

        result = {
            "status": "success",
            "filename": paper_data['filename'],
            "num_pages": paper_data['num_pages'],
            "total_chars": paper_data['total_chars'],
            "has_sections": paper_data['has_sections'],
            "preview": paper_data['full_text'][:1000] + "..." if len(paper_data['full_text']) > 1000 else paper_data['full_text'],
        }

        return json.dumps(result, indent=2)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def extract_key_findings(file_path: str) -> str:
    """
    Extract key findings, methodology, and conclusions from the research paper.

    Args:
        file_path: Path to the PDF file (must be parsed first)

    Returns:
        JSON string with extracted key information
    """
    try:
        if file_path not in _paper_cache:
            return json.dumps({
                "status": "error",
                "message": "Paper not parsed. Please parse the paper first using parse_research_paper."
            })

        paper_data = _paper_cache[file_path]
        full_text = paper_data['full_text'].lower()

        # Extract abstract
        abstract = _extract_section(paper_data['full_text'], 'abstract')

        # Extract methodology/methods
        methods = _extract_section(paper_data['full_text'], 'method')

        # Extract results
        results = _extract_section(paper_data['full_text'], 'result')

        # Extract conclusion
        conclusion = _extract_section(paper_data['full_text'], 'conclusion')

        # Extract sample size mentions
        sample_size_patterns = [
            r'n\s*=\s*(\d+)',
            r'sample size.*?(\d+)',
            r'(\d+)\s+participants?',
            r'(\d+)\s+patients?',
            r'(\d+)\s+subjects?',
        ]

        sample_sizes = []
        for pattern in sample_size_patterns:
            matches = re.findall(pattern, full_text, re.IGNORECASE)
            sample_sizes.extend(matches)

        result = {
            "status": "success",
            "abstract": abstract[:500] + "..." if abstract and len(abstract) > 500 else abstract,
            "methodology": methods[:500] + "..." if methods and len(methods) > 500 else methods,
            "results": results[:500] + "..." if results and len(results) > 500 else results,
            "conclusion": conclusion[:500] + "..." if conclusion and len(conclusion) > 500 else conclusion,
            "mentioned_sample_sizes": list(set(sample_sizes))[:5],  # Unique, limited to 5
        }

        return json.dumps(result, indent=2)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def analyze_paper_statistics(file_path: str) -> str:
    """
    Analyze statistical information mentioned in the research paper.

    Args:
        file_path: Path to the PDF file (must be parsed first)

    Returns:
        JSON string with statistical analysis
    """
    try:
        if file_path not in _paper_cache:
            return json.dumps({
                "status": "error",
                "message": "Paper not parsed. Please parse the paper first."
            })

        paper_data = _paper_cache[file_path]
        full_text = paper_data['full_text'].lower()

        # Extract p-values
        p_value_pattern = r'p\s*[=<>]\s*0?\.\d+'
        p_values = re.findall(p_value_pattern, full_text, re.IGNORECASE)

        # Extract confidence intervals
        ci_pattern = r'(\d+)%\s*(?:confidence interval|ci)'
        confidence_intervals = re.findall(ci_pattern, full_text, re.IGNORECASE)

        # Extract statistical tests mentioned
        statistical_tests = []
        test_keywords = [
            't-test', 't test', 'anova', 'chi-square', 'chi square',
            'regression', 'correlation', 'mann-whitney', 'wilcoxon',
            'fisher', 'kruskal-wallis', 'logistic regression',
            'linear regression', 'mixed model', 'meta-analysis'
        ]

        for test in test_keywords:
            if test in full_text:
                statistical_tests.append(test)

        # Extract effect sizes
        effect_size_patterns = [
            r'effect size.*?(\d+\.?\d*)',
            r'cohen\'?s? d.*?(\d+\.?\d*)',
            r'odds ratio.*?(\d+\.?\d*)',
            r'hazard ratio.*?(\d+\.?\d*)',
        ]

        effect_sizes = []
        for pattern in effect_size_patterns:
            matches = re.findall(pattern, full_text, re.IGNORECASE)
            effect_sizes.extend(matches)

        result = {
            "status": "success",
            "p_values_mentioned": p_values[:10],  # Limit to 10
            "confidence_intervals": list(set(confidence_intervals)),
            "statistical_tests_used": list(set(statistical_tests)),
            "effect_sizes_mentioned": effect_sizes[:5],
            "has_statistical_analysis": len(p_values) > 0 or len(statistical_tests) > 0,
        }

        return json.dumps(result, indent=2)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def summarize_paper(file_path: str) -> str:
    """
    Create a comprehensive summary of the research paper.

    Args:
        file_path: Path to the PDF file (must be parsed first)

    Returns:
        JSON string with paper summary
    """
    try:
        if file_path not in _paper_cache:
            return json.dumps({
                "status": "error",
                "message": "Paper not parsed. Please parse the paper first."
            })

        paper_data = _paper_cache[file_path]
        full_text = paper_data['full_text']

        # Get key findings
        key_findings_json = extract_key_findings(file_path)
        key_findings = json.loads(key_findings_json)

        # Get statistical analysis
        stats_json = analyze_paper_statistics(file_path)
        stats = json.loads(stats_json)

        # Identify study type
        study_types = []
        study_keywords = {
            'randomized controlled trial': 'RCT',
            'rct': 'RCT',
            'cohort study': 'Cohort Study',
            'case-control': 'Case-Control Study',
            'cross-sectional': 'Cross-Sectional Study',
            'meta-analysis': 'Meta-Analysis',
            'systematic review': 'Systematic Review',
            'observational study': 'Observational Study',
            'clinical trial': 'Clinical Trial',
        }

        text_lower = full_text.lower()
        for keyword, study_type in study_keywords.items():
            if keyword in text_lower:
                study_types.append(study_type)

        result = {
            "status": "success",
            "filename": paper_data['filename'],
            "num_pages": paper_data['num_pages'],
            "study_types_identified": list(set(study_types)),
            "has_abstract": key_findings.get('abstract') is not None,
            "has_methodology": key_findings.get('methodology') is not None,
            "has_results": key_findings.get('results') is not None,
            "has_conclusion": key_findings.get('conclusion') is not None,
            "statistical_methods_used": stats.get('statistical_tests_used', []),
            "has_quantitative_results": stats.get('has_statistical_analysis', False),
            "key_sections": key_findings,
            "statistical_info": stats,
        }

        return json.dumps(result, indent=2)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def _extract_section(text: str, section_name: str) -> Optional[str]:
    """
    Extract a section from the paper text.

    Args:
        text: Full paper text
        section_name: Name of section to extract

    Returns:
        Extracted section text or None
    """
    # Common section headers and variations
    section_patterns = {
        'abstract': [r'\babstract\b', r'\bsummary\b'],
        'introduction': [r'\bintroduction\b', r'\bbackground\b'],
        'method': [r'\bmethods?\b', r'\bmethodology\b', r'\bmaterials and methods\b'],
        'result': [r'\bresults?\b', r'\bfindings?\b'],
        'discussion': [r'\bdiscussion\b'],
        'conclusion': [r'\bconclusions?\b', r'\bsummary\b'],
    }

    patterns = section_patterns.get(section_name.lower(), [])

    for pattern in patterns:
        # Try to find section
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            start_pos = match.start()

            # Find next section or end of document
            next_section_patterns = [
                r'\n\s*\d+\.?\s+[A-Z][a-zA-Z\s]+\n',  # Numbered section
                r'\n\s*[A-Z][A-Z\s]{3,}\n',  # ALL CAPS header
            ]

            end_pos = len(text)
            for next_pattern in next_section_patterns:
                next_match = re.search(next_pattern, text[start_pos + 50:], re.MULTILINE)
                if next_match:
                    end_pos = start_pos + 50 + next_match.start()
                    break

            # Extract section (limit to 2000 chars)
            section_text = text[start_pos:end_pos]
            if len(section_text) > 2000:
                section_text = section_text[:2000]

            return section_text.strip()

    return None
