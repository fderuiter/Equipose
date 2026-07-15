import { Injectable, OnDestroy, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ProgressAnnouncerService implements OnDestroy {
  private liveRegion: HTMLElement;
  private taskStates = new Map<string, { lastMilestone: number, lastAnnouncedTime: number, timerId?: any }>();
  
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
      const timeSinceLast = now - state.lastAnnouncedTime;

      if (state.timerId) {
        clearTimeout(state.timerId);
        state.timerId = undefined;
      }

      if (timeSinceLast >= this.THROTTLE_MS || state.lastMilestone === -1) {
        this.doAnnounce(taskName, achievedMilestone, state);
      } else {
        const delay = this.THROTTLE_MS - timeSinceLast;
        state.timerId = setTimeout(() => {
          this.doAnnounce(taskName, achievedMilestone, state);
          state.timerId = undefined;
        }, delay);
      }
      
      state.lastMilestone = achievedMilestone;
      this.taskStates.set(taskName, state);
    }
  }

  private doAnnounce(taskName: string, milestone: number, state: any): void {
    state.lastAnnouncedTime = Date.now();
    this.taskStates.set(taskName, state);
    
    // Clear and reset to ensure screen reader detects the change even if the text is identical
    this.liveRegion.textContent = '';
    // Small delay to allow DOM to register the empty state before updating
    setTimeout(() => {
      this.liveRegion.textContent = `${taskName} progress: ${milestone}%`;
    }, 50);
  }

  /**
   * Reset tracking for a task if it needs to be restarted.
   */
  resetTask(taskName: string = 'Simulation'): void {
    const state = this.taskStates.get(taskName);
    if (state?.timerId) {
      clearTimeout(state.timerId);
    }
    this.taskStates.delete(taskName);
  }

  ngOnDestroy(): void {
    if (this.liveRegion && this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
    }
  }
}
