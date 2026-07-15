import { TestBed } from '@angular/core/testing';
import { FormControl } from '../../../core/forms/signal-forms';
import { vi } from 'vitest';
import { TagInputComponent } from './tag-input.component';

describe('TagInputComponent', () => {
  let component: TagInputComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagInputComponent]
    }).compileComponents();

    const fixture = TestBed.createComponent(TagInputComponent);
    component = fixture.componentInstance;
    component.control = new FormControl('');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('parseValue()', () => {
    it('should parse a comma-separated string into a trimmed array', () => {
      expect(component.parseValue('101, 102, 103')).toEqual(['101', '102', '103']);
    });

    it('should return an empty array for null', () => {
      expect(component.parseValue(null)).toEqual([]);
    });

    it('should return an empty array for an empty string', () => {
      expect(component.parseValue('')).toEqual([]);
    });

    it('should filter out blank segments caused by consecutive commas', () => {
      expect(component.parseValue('a,,b')).toEqual(['a', 'b']);
    });
  });

  describe('toStr()', () => {
    it('should join tags with ", "', () => {
      component.tags = ['101', '102', '103'];
      expect(component.toStr()).toBe('101, 102, 103');
    });

    it('should return empty string when there are no tags', () => {
      component.tags = [];
      expect(component.toStr()).toBe('');
    });
  });

  describe('ngOnInit()', () => {
    it('should initialise tags from the control value', () => {
      const ctrl = new FormControl('a, b, c');
      const fixture = TestBed.createComponent(TagInputComponent);
      const comp = fixture.componentInstance;
      comp.control = ctrl;
      fixture.detectChanges();
      expect(comp.tags).toEqual(['a', 'b', 'c']);
    });

    it('should update tags when the control value changes externally', () => {
      const fixture = TestBed.createComponent(TagInputComponent);
      const comp = fixture.componentInstance;
      comp.control = component.control;
      fixture.detectChanges();
      comp.control.setValue('x, y');
      fixture.detectChanges();
      expect(comp.tags).toEqual(['x', 'y']);
    });
  });

  describe('commitInput()', () => {
    it('should add a new tag and update the control value', () => {
      component.inputValue = '101';
      component.commitInput();
      expect(component.tags).toContain('101');
      expect(component.control.value).toBe('101');
    });

    it('should clear inputValue after adding', () => {
      component.inputValue = '101';
      component.commitInput();
      expect(component.inputValue).toBe('');
    });

    it('should not add a duplicate tag', () => {
      component.tags = ['101'];
      component.inputValue = '101';
      component.commitInput();
      expect(component.tags.filter(t => t === '101').length).toBe(1);
    });

    it('should trim trailing commas from the input', () => {
      component.inputValue = '101,';
      component.commitInput();
      expect(component.tags).toContain('101');
    });

    it('should split comma-separated pasted values into individual tags', () => {
      component.inputValue = 'Site A, Site B, Site C';
      component.commitInput();
      expect(component.tags).toEqual(['Site A', 'Site B', 'Site C']);
      expect(component.control.value).toBe('Site A, Site B, Site C');
    });

    it('should split newline-separated pasted values into individual tags', () => {
      component.inputValue = 'Site A\nSite B\r\nSite C';
      component.commitInput();
      expect(component.tags).toEqual(['Site A', 'Site B', 'Site C']);
      expect(component.control.value).toBe('Site A, Site B, Site C');
    });

    it('should handle mixed comma and newline separators', () => {
      component.inputValue = 'Site A, Site B\nSite C,Site D';
      component.commitInput();
      expect(component.tags).toEqual(['Site A', 'Site B', 'Site C', 'Site D']);
    });

    it('should skip pasted duplicate values and handle duplicates within the paste', () => {
      component.tags = ['Site A'];
      component.inputValue = 'Site A, Site B, Site B, Site C';
      component.commitInput();
      expect(component.tags).toEqual(['Site A', 'Site B', 'Site C']);
    });

    it('should handle empty-string tokens from consecutive separators', () => {
      component.inputValue = 'Site A,,Site B\n\nSite C';
      component.commitInput();
      expect(component.tags).toEqual(['Site A', 'Site B', 'Site C']);
    });

    it('should not add an empty tag', () => {
      component.inputValue = '   ';
      component.commitInput();
      expect(component.tags.length).toBe(0);
    });
  });

  describe('removeTag()', () => {
    it('should remove the specified tag and update the control', () => {
      component.tags = ['101', '102', '103'];
      component.removeTag('102');
      expect(component.tags).toEqual(['101', '103']);
      expect(component.control.value).toBe('101, 103');
    });
  });

  describe('onKeydown()', () => {
    it('should call commitInput on Enter', () => {
      component.inputValue = '999';
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      const spy = vi.spyOn(component, 'commitInput');
      component.onKeydown(event);
      expect(spy).toHaveBeenCalled();
    });

    it('should call commitInput on comma key', () => {
      component.inputValue = '888';
      const event = new KeyboardEvent('keydown', { key: ',' });
      const spy = vi.spyOn(component, 'commitInput');
      component.onKeydown(event);
      expect(spy).toHaveBeenCalled();
    });

    it('should focus the last tag button on Backspace when inputValue is empty', () => {
      const fixture = TestBed.createComponent(TagInputComponent);
      const comp = fixture.componentInstance;
      comp.control = new FormControl('101, 102');
      fixture.detectChanges();

      comp.inputValue = '';
      const event = new KeyboardEvent('keydown', { key: 'Backspace' });
      comp.onKeydown(event);

      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(document.activeElement).toBe(buttons[1]);
    });

    it('should NOT focus a tag button on Backspace when inputValue is non-empty', () => {
      const fixture = TestBed.createComponent(TagInputComponent);
      const comp = fixture.componentInstance;
      comp.control = new FormControl('101, 102');
      fixture.detectChanges();

      comp.inputValue = 'abc';
      const event = new KeyboardEvent('keydown', { key: 'Backspace' });
      comp.onKeydown(event);

      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(document.activeElement).not.toBe(buttons[1]);
    });
  });

  describe('onBlur()', () => {
    it('should commit the current inputValue on blur', () => {
      component.inputValue = '555';
      component.onBlur();
      expect(component.tags).toContain('555');
    });

    it('should not add anything on blur when inputValue is empty', () => {
      component.inputValue = '';
      component.onBlur();
      expect(component.tags.length).toBe(0);
    });
  });
});
