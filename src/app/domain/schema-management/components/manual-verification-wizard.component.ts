import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { RandomizationEngineFacade } from '../../randomization-engine/randomization-engine.facade';

export interface VerificationData {
  language: string;
  code: string;
}

export interface VerificationSample {
  rowIndex: number;
  subjectId: string;
  treatmentArm: string;
  strataValues: string;
  verified: boolean;
}

@Component({
  selector: 'app-manual-verification-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CdkStepperModule],
  templateUrl: './manual-verification-wizard.component.html'
})
export class ManualVerificationWizardComponent implements OnInit {
  dialogRef = inject(DialogRef);
  data = inject(DIALOG_DATA) as VerificationData;
  facade = inject(RandomizationEngineFacade);

  currentStep = signal<number>(0);
  
  auditHash = computed(() => {
    return this.facade.results()?.metadata?.auditHash || 'N/A';
  });

  samples = signal<VerificationSample[]>([]);
  
  allVerified = computed(() => {
    return this.samples().length > 0 && this.samples().every(s => s.verified);
  });
  
  copied = signal(false);

  ngOnInit() {
    this.generateSamples();
    this.downloadCode();
  }
  
  downloadCode() {
    const code = this.data.code;
    const tab = this.data.language;
    const extension = tab === 'SAS' ? 'sas' : 'do';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `randomization_schema.${extension}`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }

  generateSamples() {
    const results = this.facade.results();
    if (!results || !results.schema || results.schema.length === 0) {
      return;
    }
    
    const schema = results.schema;
    const total = schema.length;
    
    // Pick up to 5 samples: start, 3 in middle, end
    const indices = new Set<number>();
    indices.add(0);
    indices.add(total - 1);
    
    if (total > 2) {
      indices.add(Math.floor(total / 4));
      indices.add(Math.floor(total / 2));
      indices.add(Math.floor((total * 3) / 4));
    }
    
    const sortedIndices = Array.from(indices).sort((a, b) => a - b).slice(0, 5);
    
    const generatedSamples = sortedIndices.map(idx => {
      const row = schema[idx];
      
      // format strata values
      const strataKeys = Object.keys(row).filter(k => k !== 'subjectId' && k !== 'treatmentArm');
      const strataValues = strataKeys.map(k => `${k}: ${row[k]}`).join(', ');
      
      return {
        rowIndex: idx + 1, // 1-based index
        subjectId: row.subjectId,
        treatmentArm: row.treatmentArm,
        strataValues: strataValues,
        verified: false
      };
    });
    
    this.samples.set(generatedSamples);
  }

  toggleVerification(index: number) {
    this.samples.update(current => {
      const updated = [...current];
      updated[index] = { ...updated[index], verified: !updated[index].verified };
      return updated;
    });
  }

  copyHash() {
    navigator.clipboard.writeText(this.auditHash());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  nextStep() {
    this.currentStep.update(s => s + 1);
  }

  prevStep() {
    this.currentStep.update(s => s - 1);
  }
  
  close(skip: boolean) {
    this.dialogRef.close(skip);
  }
}
