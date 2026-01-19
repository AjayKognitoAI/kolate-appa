"""Visualization helper functions."""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Optional, List, Dict, Any
import os
from datetime import datetime


class VisualizationHelper:
    """Provides data visualization functions."""

    def __init__(self, output_dir: str = "./data/visualizations"):
        """
        Initialize visualization helper.

        Args:
            output_dir: Directory to save visualizations
        """
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

        # Set style
        sns.set_style("whitegrid")
        plt.rcParams['figure.figsize'] = (10, 6)

    def _save_plot(self, filename: Optional[str] = None) -> str:
        """Save the current plot and return the file path."""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"plot_{timestamp}.png"

        filepath = os.path.join(self.output_dir, filename)
        plt.tight_layout()
        plt.savefig(filepath, dpi=300, bbox_inches='tight')
        plt.close()
        return filepath

    def create_histogram(
        self,
        data: pd.Series,
        title: Optional[str] = None,
        xlabel: Optional[str] = None,
        bins: int = 30,
        filename: Optional[str] = None
    ) -> str:
        """
        Create histogram.

        Args:
            data: pandas Series
            title: Plot title
            xlabel: X-axis label
            bins: Number of bins
            filename: Output filename

        Returns:
            Path to saved plot
        """
        plt.figure(figsize=(10, 6))
        plt.hist(data.dropna(), bins=bins, edgecolor='black', alpha=0.7)
        plt.title(title or f"Distribution of {data.name}")
        plt.xlabel(xlabel or data.name)
        plt.ylabel("Frequency")
        plt.grid(True, alpha=0.3)
        return self._save_plot(filename)

    def create_boxplot(
        self,
        df: pd.DataFrame,
        columns: Optional[List[str]] = None,
        title: Optional[str] = None,
        filename: Optional[str] = None
    ) -> str:
        """
        Create box plot for numeric columns.

        Args:
            df: pandas DataFrame
            columns: Columns to plot
            title: Plot title
            filename: Output filename

        Returns:
            Path to saved plot
        """
        if columns is None:
            columns = df.select_dtypes(include=[np.number]).columns.tolist()

        plt.figure(figsize=(12, 6))
        df[columns].boxplot()
        plt.title(title or "Box Plot")
        plt.ylabel("Values")
        plt.xticks(rotation=45, ha='right')
        return self._save_plot(filename)

    def create_correlation_heatmap(
        self,
        df: pd.DataFrame,
        columns: Optional[List[str]] = None,
        method: str = "pearson",
        title: Optional[str] = None,
        filename: Optional[str] = None
    ) -> str:
        """
        Create correlation heatmap.

        Args:
            df: pandas DataFrame
            columns: Columns to include
            method: Correlation method
            title: Plot title
            filename: Output filename

        Returns:
            Path to saved plot
        """
        if columns is None:
            columns = df.select_dtypes(include=[np.number]).columns.tolist()

        plt.figure(figsize=(12, 10))
        corr = df[columns].corr(method=method)
        sns.heatmap(corr, annot=True, fmt='.2f', cmap='coolwarm', center=0,
                   square=True, linewidths=1, cbar_kws={"shrink": 0.8})
        plt.title(title or f"{method.capitalize()} Correlation Matrix")
        plt.tight_layout()
        return self._save_plot(filename)

    def create_scatter_plot(
        self,
        df: pd.DataFrame,
        x_column: str,
        y_column: str,
        hue_column: Optional[str] = None,
        title: Optional[str] = None,
        filename: Optional[str] = None
    ) -> str:
        """
        Create scatter plot.

        Args:
            df: pandas DataFrame
            x_column: Column for x-axis
            y_column: Column for y-axis
            hue_column: Column for color coding
            title: Plot title
            filename: Output filename

        Returns:
            Path to saved plot
        """
        plt.figure(figsize=(10, 6))
        if hue_column:
            sns.scatterplot(data=df, x=x_column, y=y_column, hue=hue_column, alpha=0.6)
        else:
            sns.scatterplot(data=df, x=x_column, y=y_column, alpha=0.6)

        plt.title(title or f"{y_column} vs {x_column}")
        plt.xlabel(x_column)
        plt.ylabel(y_column)
        return self._save_plot(filename)

    def create_line_plot(
        self,
        df: pd.DataFrame,
        x_column: str,
        y_columns: List[str],
        title: Optional[str] = None,
        filename: Optional[str] = None
    ) -> str:
        """
        Create line plot.

        Args:
            df: pandas DataFrame
            x_column: Column for x-axis
            y_columns: Columns for y-axis
            title: Plot title
            filename: Output filename

        Returns:
            Path to saved plot
        """
        plt.figure(figsize=(12, 6))
        for col in y_columns:
            plt.plot(df[x_column], df[col], marker='o', label=col, alpha=0.7)

        plt.title(title or "Line Plot")
        plt.xlabel(x_column)
        plt.ylabel("Values")
        plt.legend()
        plt.grid(True, alpha=0.3)
        return self._save_plot(filename)

    def create_bar_chart(
        self,
        df: pd.DataFrame,
        x_column: str,
        y_column: str,
        title: Optional[str] = None,
        filename: Optional[str] = None,
        horizontal: bool = False
    ) -> str:
        """
        Create bar chart.

        Args:
            df: pandas DataFrame
            x_column: Column for x-axis (categories)
            y_column: Column for y-axis (values)
            title: Plot title
            filename: Output filename
            horizontal: Create horizontal bar chart

        Returns:
            Path to saved plot
        """
        plt.figure(figsize=(10, 6))

        if horizontal:
            plt.barh(df[x_column], df[y_column], alpha=0.7)
            plt.xlabel(y_column)
            plt.ylabel(x_column)
        else:
            plt.bar(df[x_column], df[y_column], alpha=0.7)
            plt.xlabel(x_column)
            plt.ylabel(y_column)
            plt.xticks(rotation=45, ha='right')

        plt.title(title or f"{y_column} by {x_column}")
        plt.grid(True, alpha=0.3, axis='y' if not horizontal else 'x')
        return self._save_plot(filename)

    def create_pie_chart(
        self,
        data: pd.Series,
        title: Optional[str] = None,
        filename: Optional[str] = None,
        top_n: Optional[int] = None
    ) -> str:
        """
        Create pie chart.

        Args:
            data: pandas Series with values
            title: Plot title
            filename: Output filename
            top_n: Show only top N categories

        Returns:
            Path to saved plot
        """
        plt.figure(figsize=(10, 8))

        if top_n:
            data_plot = data.value_counts().head(top_n)
        else:
            data_plot = data.value_counts()

        plt.pie(data_plot.values, labels=data_plot.index, autopct='%1.1f%%',
               startangle=90, counterclock=False)
        plt.title(title or f"Distribution of {data.name}")
        plt.axis('equal')
        return self._save_plot(filename)

    def create_distribution_plot(
        self,
        data: pd.Series,
        title: Optional[str] = None,
        filename: Optional[str] = None,
        show_kde: bool = True
    ) -> str:
        """
        Create distribution plot with histogram and KDE.

        Args:
            data: pandas Series
            title: Plot title
            filename: Output filename
            show_kde: Show kernel density estimate

        Returns:
            Path to saved plot
        """
        plt.figure(figsize=(10, 6))
        sns.histplot(data.dropna(), kde=show_kde, bins=30)
        plt.title(title or f"Distribution of {data.name}")
        plt.xlabel(data.name)
        plt.ylabel("Frequency")
        return self._save_plot(filename)

    def create_pairplot(
        self,
        df: pd.DataFrame,
        columns: Optional[List[str]] = None,
        hue: Optional[str] = None,
        filename: Optional[str] = None
    ) -> str:
        """
        Create pairwise relationship plot.

        Args:
            df: pandas DataFrame
            columns: Columns to include
            hue: Column for color coding
            filename: Output filename

        Returns:
            Path to saved plot
        """
        if columns is None:
            columns = df.select_dtypes(include=[np.number]).columns.tolist()[:5]  # Limit to 5

        pairplot = sns.pairplot(df[columns + ([hue] if hue else [])], hue=hue)
        filepath = self._save_plot(filename)
        plt.close()
        return filepath

    def create_time_series_plot(
        self,
        df: pd.DataFrame,
        date_column: str,
        value_columns: List[str],
        title: Optional[str] = None,
        filename: Optional[str] = None
    ) -> str:
        """
        Create time series plot.

        Args:
            df: pandas DataFrame
            date_column: Column with dates
            value_columns: Columns with values to plot
            title: Plot title
            filename: Output filename

        Returns:
            Path to saved plot
        """
        plt.figure(figsize=(14, 6))

        for col in value_columns:
            plt.plot(df[date_column], df[col], marker='o', label=col, alpha=0.7, linewidth=2)

        plt.title(title or "Time Series Plot")
        plt.xlabel(date_column)
        plt.ylabel("Values")
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.xticks(rotation=45, ha='right')
        return self._save_plot(filename)
