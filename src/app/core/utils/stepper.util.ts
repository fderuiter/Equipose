import { signal, computed, Signal } from '@angular/core';

export interface StepConfig {
  canLeave?: () => boolean;
  onLeave?: () => void;
  onEnter?: () => void;
}

export interface StepperState {
  currentStepIndex: Signal<number>;
  totalSteps: Signal<number>;
  isFirst: Signal<boolean>;
  isLast: Signal<boolean>;
  progressPercentage: Signal<number>;
  
  /** Tracks completion status for each step. True means complete, false means incomplete. */
  stepCompletionStatus: Signal<boolean[]>;
  /** Overall workflow completion status */
  isComplete: Signal<boolean>;

  next: () => void;
  previous: () => void;
  goTo: (step: number) => void;
  markStepComplete: (step: number, complete?: boolean) => void;
}

export function createStepper(totalStepsCount: number, configs: Record<number, StepConfig> = {}): StepperState {
  const currentStepIndex = signal(0);
  const totalSteps = signal(totalStepsCount);
  
  // Track completion of individual steps
  const stepCompletionStatus = signal<boolean[]>(new Array(totalStepsCount).fill(false));
  
  const isFirst = computed(() => currentStepIndex() === 0);
  const isLast = computed(() => currentStepIndex() === totalSteps() - 1);
  const progressPercentage = computed(() => {
    const total = totalSteps();
    if (total <= 1) return 100;
    return (currentStepIndex() / (total - 1)) * 100;
  });
  
  const isComplete = computed(() => {
    const status = stepCompletionStatus();
    return status.every(s => s);
  });

  const markStepComplete = (step: number, complete = true) => {
    if (step >= 0 && step < totalSteps()) {
      stepCompletionStatus.update(status => {
        const newStatus = [...status];
        newStatus[step] = complete;
        return newStatus;
      });
    }
  };

  const goTo = (targetStep: number) => {
    const current = currentStepIndex();
    const total = totalSteps();
    
    if (targetStep < 0 || targetStep >= total ) {
      return;
    }

    const currentConfig = configs[current];
    if (currentConfig?.canLeave && !currentConfig.canLeave()) {
      return;
    }

    if (currentConfig?.onLeave) {
      currentConfig.onLeave();
    }

    // Automatically mark the step as complete if transitioning forward,
    // though the user can manage it explicitly via markStepComplete if needed.
    // For simplicity and standard wizard behavior, we mark the current step complete when leaving it successfully.
    markStepComplete(current, true);

    currentStepIndex.set(targetStep);

    const newConfig = configs[targetStep];
    if (newConfig?.onEnter) {
      newConfig.onEnter();
    }
  };

  const next = () => {
    if (!isLast()) {
      goTo(currentStepIndex() + 1);
    }
  };

  const previous = () => {
    if (!isFirst()) {
      goTo(currentStepIndex() - 1);
    }
  };

  return {
    currentStepIndex: currentStepIndex.asReadonly(),
    totalSteps: totalSteps.asReadonly(),
    isFirst,
    isLast,
    progressPercentage,
    isComplete,
    stepCompletionStatus: stepCompletionStatus.asReadonly(),
    next,
    previous,
    goTo,
    markStepComplete
  };
}
