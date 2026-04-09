import { TestBed } from '@angular/core/testing';
import {
  BlockPreviewComponent,
  ArmInput,
  ARM_COLORS,
  calcTotalRatio,
  buildPreviews,
} from './block-preview.component';

const TWO_ARMS: ArmInput[] = [
  { id: 'A', name: 'Active', ratio: 1 },
  { id: 'B', name: 'Placebo', ratio: 1 },
];

const THREE_ONE_ARMS: ArmInput[] = [
  { id: 'A', name: 'Active', ratio: 2 },
  { id: 'B', name: 'Placebo', ratio: 1 },
];

// ─── Pure-function unit tests (no Angular TestBed needed) ─────────────────────

describe('calcTotalRatio()', () => {
  it('should return 1 when arms array is empty', () => {
    expect(calcTotalRatio([])).toBe(1);
  });

  it('should sum arm ratios for a 1:1 setup', () => {
    expect(calcTotalRatio(TWO_ARMS)).toBe(2);
  });

  it('should sum arm ratios for a 2:1 setup', () => {
    expect(calcTotalRatio(THREE_ONE_ARMS)).toBe(3);
  });
});

describe('buildPreviews()', () => {
  it('should return empty array when no arms are provided', () => {
    expect(buildPreviews([], [4])).toEqual([]);
  });

  it('should return empty array when no block sizes are provided', () => {
    expect(buildPreviews(TWO_ARMS, [])).toEqual([]);
  });

  it('should compute a valid preview for a 1:1 ratio with block size 2', () => {
    const previews = buildPreviews(TWO_ARMS, [2]);

    expect(previews.length).toBe(1);
    expect(previews[0].blockSize).toBe(2);
    expect(previews[0].isValid).toBe(true);
    expect(previews[0].slots.length).toBe(2);
    expect(previews[0].slots.every(s => !s.isInvalid)).toBe(true);
  });

  it('should mark block size as invalid when not divisible by totalRatio', () => {
    // ratio 2:1 → total 3, block 4 → 4 % 3 = 1 → invalid
    const previews = buildPreviews(THREE_ONE_ARMS, [4]);

    expect(previews.length).toBe(1);
    expect(previews[0].isValid).toBe(false);
  });

  it('should render the correct number of invalid (remainder) slots', () => {
    // ratio 2:1, total 3, block size 4 → remainder 1
    const previews = buildPreviews(THREE_ONE_ARMS, [4]);

    expect(previews[0].slots.length).toBe(4);
    const invalidSlots = previews[0].slots.filter(s => s.isInvalid);
    expect(invalidSlots.length).toBe(1);
  });

  it('should produce previews for multiple block sizes', () => {
    const previews = buildPreviews(TWO_ARMS, [2, 4, 6]);

    expect(previews.length).toBe(3);
    expect(previews.every(p => p.isValid)).toBe(true);
  });

  it('should not include zero or negative block sizes in previews', () => {
    const previews = buildPreviews([{ id: 'A', name: 'Active', ratio: 1 }], [0, -1, 2]);

    expect(previews.length).toBe(1);
    expect(previews[0].blockSize).toBe(2);
  });

  it('should have only valid slots when block size is valid', () => {
    const previews = buildPreviews(TWO_ARMS, [4]);

    expect(previews[0].slots.length).toBe(4);
    expect(previews[0].slots.filter(s => s.isInvalid).length).toBe(0);
  });

  it('invalid slot should have descriptive tooltip', () => {
    const previews = buildPreviews(THREE_ONE_ARMS, [4]);
    const invalidSlot = previews[0].slots.find(s => s.isInvalid);

    expect(invalidSlot).toBeDefined();
    expect(invalidSlot!.tooltip).toContain('Unallocatable');
  });

  it('valid slots should carry the arm name as tooltip', () => {
    const previews = buildPreviews(TWO_ARMS, [2]);
    const names = previews[0].slots.map(s => s.tooltip);

    expect(names).toContain('Active');
    expect(names).toContain('Placebo');
  });

  it('should correctly use arm colors from the ARM_COLORS palette', () => {
    const previews = buildPreviews(TWO_ARMS, [2]);

    expect(previews[0].slots[0].bgClass).toBe(ARM_COLORS[0]);
    expect(previews[0].slots[1].bgClass).toBe(ARM_COLORS[1]);
  });
});

// ─── Angular component smoke test (no templateUrl to resolve) ─────────────────

describe('BlockPreviewComponent (Angular)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlockPreviewComponent],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(BlockPreviewComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('armColor() should return indigo for index 0', () => {
    const fixture = TestBed.createComponent(BlockPreviewComponent);
    expect(fixture.componentInstance.armColor(0)).toBe('bg-indigo-500');
  });

  it('armColor() should cycle when index exceeds palette length', () => {
    const comp = TestBed.createComponent(BlockPreviewComponent).componentInstance;
    expect(comp.armColor(ARM_COLORS.length)).toBe(comp.armColor(0));
  });

  it('gridCols() should cap at 12 for large block sizes', () => {
    const comp = TestBed.createComponent(BlockPreviewComponent).componentInstance;
    expect(comp.gridCols(24)).toBe(12);
  });

  it('gridCols() should return the block size when <= 12', () => {
    const comp = TestBed.createComponent(BlockPreviewComponent).componentInstance;
    expect(comp.gridCols(6)).toBe(6);
  });
});

