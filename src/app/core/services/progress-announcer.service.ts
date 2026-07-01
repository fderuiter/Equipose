import { Injectable, OnDestroy, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ProgressAnnouncerService implements OnDestroy {
  private liveRegion: HTMLElement;
  private taskStates = new Map<string, { lastMilestone: number, lastAnnouncedTime: number }>();
  
  private readonly MILESTONES = [0, 25, 50, 75, 100];
  private readonly THROTTLE_MS = 5000;

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.liveRegion = this.document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only';
    this.document.body.appendChild(this.liveRegion);
  }

  /**
   * Broadcasts a progress update for a background task.
   * Throttles announcements to specific percentage milestones (0, 25, 50, 75, 100).
   * Ensures announcements do not trigger more than once every 5 seconds.
   */
  announceProgress(progressPct: number, taskName: string = 'Simulation'): void {
    const state = this.taskStates.get(taskName) || { lastMilestone: -1, lastAnnouncedTime: 0 };
    
    let achievedMilestone = -1;
    for (const milestone of this.MILESTONES) {
      if (progressPct >= milestone) {
        achievedMilestone = milestone;
      }
    }

    if (achievedMilestone > state.lastMilestone) {
      const now = Date.now();
      if (now - state.lastAnnouncedTime >= this.THROTTLE_MS || state.lastMilestone === -1) {
        state.lastMilestone = achievedMilestone;
        state.lastAnnouncedTime = now;
        this.taskStates.set(taskName, state);

        this.liveRegion.textContent = `${taskName} progress: ${Math.round(progressPct)}%`;
      }
    }
  }

  /**
   * Reset tracking for a task if it needs to be restarted.
   */
  resetTask(taskName: string = 'Simulation'): void {
    this.taskStates.delete(taskName);
  }

  ngOnDestroy(): void {
    if (this.liveRegion && this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
    }
  }
}
