"""Scheduler Service for periodic background tasks."""

import asyncio
from datetime import datetime
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR

from api.services.trial_sync_service import TrialSyncService, SyncResult


class SchedulerService:
    """Manages background jobs for S3 polling and sync."""

    def __init__(self, trial_sync_service: TrialSyncService):
        """
        Initialize Scheduler Service.

        Args:
            trial_sync_service: Service for syncing trials from S3
        """
        self.sync_service = trial_sync_service
        self.scheduler = AsyncIOScheduler()
        self._job_id = "s3_trial_sync"
        self._is_running = False
        self._last_sync_result: Optional[SyncResult] = None
        self._sync_in_progress = False

        # Add event listeners
        self.scheduler.add_listener(self._job_executed, EVENT_JOB_EXECUTED)
        self.scheduler.add_listener(self._job_error, EVENT_JOB_ERROR)

    def _job_executed(self, event):
        """Handle successful job execution."""
        print(f"[Scheduler] Job '{event.job_id}' executed successfully at {datetime.now()}")

    def _job_error(self, event):
        """Handle job execution error."""
        print(f"[Scheduler] Job '{event.job_id}' failed: {event.exception}")

    def start(self, interval_minutes: int = 15, run_immediately: bool = True):
        """
        Start the scheduler with periodic S3 sync.

        Args:
            interval_minutes: Interval between sync jobs in minutes
            run_immediately: If True, trigger first sync immediately
        """
        if self._is_running:
            print("[Scheduler] Already running")
            return

        # Add the periodic sync job
        self.scheduler.add_job(
            self._sync_job,
            trigger=IntervalTrigger(minutes=interval_minutes),
            id=self._job_id,
            name="S3 Trial Sync",
            replace_existing=True,
            max_instances=1  # Prevent overlapping syncs
        )

        self.scheduler.start()
        self._is_running = True
        print(f"[Scheduler] Started S3 sync job (every {interval_minutes} minutes)")

        # Trigger immediate sync in background
        if run_immediately:
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(self._sync_job())
                print("[Scheduler] Initial sync triggered in background")
            except RuntimeError:
                # No running loop - schedule it to run when loop starts
                print("[Scheduler] Initial sync will run on first interval")

    async def _sync_job(self):
        """Job wrapper for sync_all_trials."""
        if self._sync_in_progress:
            print("[Scheduler] Sync already in progress, skipping...")
            return

        self._sync_in_progress = True
        try:
            print(f"[Scheduler] Running S3 trial sync at {datetime.now()}")
            result = await self.sync_service.sync_all_trials()
            self._last_sync_result = result
            print(f"[Scheduler] Sync complete: {result.trials_synced} trials, "
                  f"{result.total_new_files} new, {result.total_updated_files} updated")
        except Exception as e:
            print(f"[Scheduler] Sync failed: {e}")
            import traceback
            traceback.print_exc()
        finally:
            self._sync_in_progress = False

    def trigger_immediate_sync(self) -> str:
        """
        Trigger an immediate sync (outside regular schedule).

        Returns:
            Status message
        """
        if self._sync_in_progress:
            return "Sync already in progress"

        # Create a task for the sync
        asyncio.create_task(self._sync_job())
        return "Manual sync triggered"

    async def trigger_sync_and_wait(self) -> SyncResult:
        """
        Trigger a sync and wait for completion.

        Returns:
            SyncResult with sync details
        """
        if self._sync_in_progress:
            # Wait for current sync to complete
            while self._sync_in_progress:
                await asyncio.sleep(1)
            return self._last_sync_result

        await self._sync_job()
        return self._last_sync_result

    def get_last_sync_result(self) -> Optional[SyncResult]:
        """
        Get the result of the last sync operation.

        Returns:
            Last SyncResult or None if no sync has run
        """
        return self._last_sync_result

    def is_sync_in_progress(self) -> bool:
        """Check if a sync is currently in progress."""
        return self._sync_in_progress

    def get_status(self) -> dict:
        """
        Get scheduler status.

        Returns:
            Dictionary with scheduler status information
        """
        job = self.scheduler.get_job(self._job_id) if self._is_running else None

        return {
            "is_running": self._is_running,
            "sync_in_progress": self._sync_in_progress,
            "next_run_time": job.next_run_time.isoformat() if job and job.next_run_time else None,
            "last_sync": {
                "started_at": self._last_sync_result.sync_started_at.isoformat() if self._last_sync_result else None,
                "completed_at": self._last_sync_result.sync_completed_at.isoformat() if self._last_sync_result and self._last_sync_result.sync_completed_at else None,
                "trials_synced": self._last_sync_result.trials_synced if self._last_sync_result else 0,
                "new_files": self._last_sync_result.total_new_files if self._last_sync_result else 0,
                "updated_files": self._last_sync_result.total_updated_files if self._last_sync_result else 0,
                "failed_files": self._last_sync_result.total_failed_files if self._last_sync_result else 0,
            } if self._last_sync_result else None
        }

    def stop(self):
        """Stop the scheduler."""
        if self._is_running:
            self.scheduler.shutdown(wait=False)
            self._is_running = False
            print("[Scheduler] Stopped")

    def pause(self):
        """Pause the scheduler (keeps job but stops execution)."""
        if self._is_running:
            self.scheduler.pause()
            print("[Scheduler] Paused")

    def resume(self):
        """Resume the scheduler."""
        if self._is_running:
            self.scheduler.resume()
            print("[Scheduler] Resumed")
