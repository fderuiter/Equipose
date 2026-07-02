import { TestBed } from '@angular/core/testing';
import { createStepper } from './stepper.util';

describe('StepperUtil', () => {
  it('should expose the current step index as a Signal', () => {
    const stepper = createStepper(3);
    expect(stepper.currentStepIndex()).toBe(0);
  });

  it('should correctly calculate isFirst, isLast, and progressPercentage', () => {
    const stepper = createStepper(3);
    expect(stepper.isFirst()).toBe(true);
    expect(stepper.isLast()).toBe(false);
    expect(stepper.progressPercentage()).toBe(0);

    stepper.next();
    expect(stepper.currentStepIndex()).toBe(1);
    expect(stepper.isFirst()).toBe(false);
    expect(stepper.isLast()).toBe(false);
    expect(stepper.progressPercentage()).toBe(50);

    stepper.next();
    expect(stepper.currentStepIndex()).toBe(2);
    expect(stepper.isFirst()).toBe(false);
    expect(stepper.isLast()).toBe(true);
    expect(stepper.progressPercentage()).toBe(100);
  });

  it('should prevent navigation to next step if guard returns false', () => {
    let guardCalled = false;
    const configs = {
      0: {
        canLeave: () => {
          guardCalled = true;
          return false;
        }
      }
    };
    const stepper = createStepper(3, configs);
    stepper.next();
    expect(guardCalled).toBe(true);
    expect(stepper.currentStepIndex()).toBe(0); // Navigation blocked
  });

  it('should allow navigation if guard returns true', () => {
    const configs = {
      0: { canLeave: () => true }
    };
    const stepper = createStepper(3, configs);
    stepper.next();
    expect(stepper.currentStepIndex()).toBe(1);
  });

  it('should fire lifecycle hooks in the correct order', () => {
    const order: string[] = [];
    const configs = {
      0: {
        onLeave: () => order.push('leave 0'),
      },
      1: {
        onEnter: () => order.push('enter 1'),
        onLeave: () => order.push('leave 1'),
      },
      2: {
        onEnter: () => order.push('enter 2'),
      }
    };
    const stepper = createStepper(3, configs);
    
    stepper.next();
    expect(order).toEqual(['leave 0', 'enter 1']);
    
    order.length = 0; // Clear array
    stepper.next();
    expect(order).toEqual(['leave 1', 'enter 2']);
  });

  it('should update state immediately without manual synchronization', () => {
    const stepper = createStepper(5);
    stepper.goTo(3);
    expect(stepper.currentStepIndex()).toBe(3);
    expect(stepper.progressPercentage()).toBe(75);
    
    stepper.previous();
    expect(stepper.currentStepIndex()).toBe(2);
    expect(stepper.progressPercentage()).toBe(50);
  });

  it('should track completion status of individual steps and overall workflow', () => {
    const stepper = createStepper(3);
    
    expect(stepper.isComplete()).toBe(false);
    expect(stepper.stepCompletionStatus()).toEqual([false, false, false]);

    // Manually mark step 0 as complete
    stepper.markStepComplete(0);
    expect(stepper.stepCompletionStatus()).toEqual([true, false, false]);
    expect(stepper.isComplete()).toBe(false);

    // Auto mark step 1 as complete when transitioning
    stepper.next(); // Go to step 1
    stepper.next(); // Go to step 2 (leaves step 1, marking it true)
    
    expect(stepper.stepCompletionStatus()).toEqual([true, true, false]);
    
    stepper.markStepComplete(2);
    expect(stepper.stepCompletionStatus()).toEqual([true, true, true]);
    expect(stepper.isComplete()).toBe(true);
  });
});
