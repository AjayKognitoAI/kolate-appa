"""
Comparison Service for Patient Screening

Service for comparing multiple cohorts and calculating overlaps.
"""

from typing import List, Dict, Set, Any
from uuid import UUID
from itertools import combinations

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.tenant.patient_screening import Cohort
from app.schemas.patient_screening.comparison_schemas import (
    CompareResponse,
    CohortComparisonDetail,
)
from app.core.logging import get_class_logger


class ComparisonService:
    """
    Service for cohort comparison operations.

    Features:
    - Compare 2-5 cohorts
    - Calculate pairwise overlaps
    - Find common patients across all cohorts
    - Calculate match rates and percentages
    """

    def __init__(self):
        self.logger = get_class_logger(self.__class__)

    async def compare_cohorts(
        self, db: AsyncSession, cohort_ids: List[UUID]
    ) -> CompareResponse:
        """
        Compare multiple cohorts and calculate overlaps.

        Args:
            db: Database session
            cohort_ids: List of cohort UUIDs to compare (2-5 cohorts)

        Returns:
            CompareResponse with comparison details

        Raises:
            ValueError: If validation fails
        """
        # Validate cohort count
        if len(cohort_ids) < 2:
            raise ValueError("At least 2 cohorts required for comparison")
        if len(cohort_ids) > 5:
            raise ValueError("Maximum 5 cohorts allowed for comparison")

        # Fetch all cohorts
        cohorts = []
        for cohort_id in cohort_ids:
            query = select(Cohort).where(Cohort.id == cohort_id)
            result = await db.execute(query)
            cohort = result.scalar_one_or_none()

            if not cohort:
                raise ValueError(f"Cohort {cohort_id} not found")

            cohorts.append(cohort)

        # Build cohort summaries
        cohort_details = []
        for cohort in cohorts:
            master_count = cohort.master_data_patient_count or 0
            match_rate = 0.0
            if master_count > 0:
                match_rate = (cohort.patient_count / master_count) * 100

            cohort_details.append(
                CohortComparisonDetail(
                    cohort_id=cohort.id,
                    cohort_name=cohort.name,
                    patient_count=cohort.patient_count,
                    master_patient_count=master_count,
                    match_rate=round(match_rate, 2),
                )
            )

        # Calculate pairwise overlaps
        overlaps = []
        for c1, c2 in combinations(cohorts, 2):
            overlap = self._calculate_overlap(c1, c2)
            overlaps.append(overlap)

        # Calculate total unique patients across all cohorts
        all_patient_ids: Set[str] = set()
        for cohort in cohorts:
            all_patient_ids.update(cohort.filtered_patient_ids or [])

        # Calculate common patients (intersection of all)
        if cohorts:
            common_to_all = set(cohorts[0].filtered_patient_ids or [])
            for cohort in cohorts[1:]:
                common_to_all &= set(cohort.filtered_patient_ids or [])
        else:
            common_to_all = set()

        self.logger.info(
            f"Compared {len(cohorts)} cohorts: "
            f"{len(all_patient_ids)} unique, {len(common_to_all)} common"
        )

        return CompareResponse(
            cohorts=cohort_details,
            overlaps=overlaps,
            total_unique_patients=len(all_patient_ids),
            common_to_all=len(common_to_all),
        )

    def _calculate_overlap(self, cohort1: Cohort, cohort2: Cohort) -> Dict[str, Any]:
        """
        Calculate overlap between two cohorts.

        Args:
            cohort1: First cohort
            cohort2: Second cohort

        Returns:
            Dictionary with overlap details
        """
        ids1 = set(cohort1.filtered_patient_ids or [])
        ids2 = set(cohort2.filtered_patient_ids or [])

        overlap = ids1 & ids2
        unique_to_first = ids1 - ids2
        unique_to_second = ids2 - ids1

        # Calculate overlap percentage based on smaller cohort
        smaller_count = min(len(ids1), len(ids2))
        overlap_percentage = 0.0
        if smaller_count > 0:
            overlap_percentage = (len(overlap) / smaller_count) * 100

        return {
            "cohort_ids": [str(cohort1.id), str(cohort2.id)],
            "overlap_count": len(overlap),
            "overlap_percentage": round(overlap_percentage, 2),
            "unique_to_first": len(unique_to_first),
            "unique_to_second": len(unique_to_second),
        }

    async def get_overlap_patients(
        self, db: AsyncSession, cohort_id_1: UUID, cohort_id_2: UUID
    ) -> List[str]:
        """
        Get list of patient IDs that are in both cohorts.

        Args:
            db: Database session
            cohort_id_1: First cohort UUID
            cohort_id_2: Second cohort UUID

        Returns:
            List of overlapping patient IDs
        """
        # Get both cohorts
        query1 = select(Cohort).where(Cohort.id == cohort_id_1)
        result1 = await db.execute(query1)
        cohort1 = result1.scalar_one_or_none()

        query2 = select(Cohort).where(Cohort.id == cohort_id_2)
        result2 = await db.execute(query2)
        cohort2 = result2.scalar_one_or_none()

        if not cohort1 or not cohort2:
            raise ValueError("One or both cohorts not found")

        ids1 = set(cohort1.filtered_patient_ids or [])
        ids2 = set(cohort2.filtered_patient_ids or [])

        return list(ids1 & ids2)

    async def get_unique_patients(
        self, db: AsyncSession, cohort_id: UUID, exclude_cohort_ids: List[UUID]
    ) -> List[str]:
        """
        Get patient IDs unique to a cohort (not in excluded cohorts).

        Args:
            db: Database session
            cohort_id: Main cohort UUID
            exclude_cohort_ids: List of cohort UUIDs to exclude patients from

        Returns:
            List of unique patient IDs
        """
        # Get main cohort
        query = select(Cohort).where(Cohort.id == cohort_id)
        result = await db.execute(query)
        main_cohort = result.scalar_one_or_none()

        if not main_cohort:
            raise ValueError(f"Cohort {cohort_id} not found")

        main_ids = set(main_cohort.filtered_patient_ids or [])

        # Get excluded patient IDs
        for exclude_id in exclude_cohort_ids:
            query = select(Cohort).where(Cohort.id == exclude_id)
            result = await db.execute(query)
            exclude_cohort = result.scalar_one_or_none()

            if exclude_cohort:
                main_ids -= set(exclude_cohort.filtered_patient_ids or [])

        return list(main_ids)

    async def get_common_patients(
        self, db: AsyncSession, cohort_ids: List[UUID]
    ) -> List[str]:
        """
        Get patient IDs common to all specified cohorts.

        Args:
            db: Database session
            cohort_ids: List of cohort UUIDs

        Returns:
            List of common patient IDs
        """
        if len(cohort_ids) < 2:
            raise ValueError("At least 2 cohorts required")

        # Get first cohort
        query = select(Cohort).where(Cohort.id == cohort_ids[0])
        result = await db.execute(query)
        first_cohort = result.scalar_one_or_none()

        if not first_cohort:
            raise ValueError(f"Cohort {cohort_ids[0]} not found")

        common_ids = set(first_cohort.filtered_patient_ids or [])

        # Intersect with remaining cohorts
        for cohort_id in cohort_ids[1:]:
            query = select(Cohort).where(Cohort.id == cohort_id)
            result = await db.execute(query)
            cohort = result.scalar_one_or_none()

            if not cohort:
                raise ValueError(f"Cohort {cohort_id} not found")

            common_ids &= set(cohort.filtered_patient_ids or [])

        return list(common_ids)
