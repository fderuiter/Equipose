import { Component, signal, inject, OnInit, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { ButtonComponent } from '../../../core/components/ui/button.component';
import { RandomizationEngineFacade } from '../../randomization-engine/randomization-engine.facade';
import { CodeGeneratorService } from '../services/code-generator.service';
import { CodeGenerationError } from '../errors/code-generation-errors';
import { RandomizationResult } from '../../core/models/randomization.model';
import { FocusManagerDirective } from '../../../core/directives/focus-manager.directive';
import { AppTooltipDirective } from '../../../core/directives/tooltip.directive';
import { AnnouncementService } from '../../../core/services/announcement.service';


/**
 * ⚡ Bolt Performance Optimization:
 * Added ChangeDetectionStrategy.OnPush to minimize unnecessary re-renders.
 */
@Component({
  selector: 'app-code-generator-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JsonPipe, FocusManagerDirective, ButtonComponent, AppTooltipDirective],
  templateUrl: './code-generator-modal.component.html'
})
export class CodeGeneratorModalComponent implements OnInit {
  public state = inject(RandomizationEngineFacade);
  private codeGenService = inject(CodeGeneratorService);
  private announcementService = inject(AnnouncementService);


  activeTab = signal<'R' | 'SAS' | 'Python' | 'STATA'>('R');
  copied = signal(false);
  errorState = signal<CodeGenerationError | null>(null);
  generatedCode = signal<string>('');

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.state.closeCodeGenerator();
  }

  async ngOnInit() {
    this.activeTab.set(this.state.codeLanguage());
    await this.refreshCode();
  }

  get currentCode(): string {
    return this.generatedCode();
  }

  async setActiveTab(tab: 'R' | 'SAS' | 'Python' | 'STATA') {
    this.activeTab.set(tab);
    await this.refreshCode();
  }

  private async refreshCode() {
    const config = this.state.config();
    this.errorState.set(null);
    if (!config) {
      this.generatedCode.set('');
      return;
    }
    try {
      let metadata: RandomizationResult['metadata'];
      const currentResults = this.state.results();
      if (currentResults && currentResults.metadata.config.seed === config.seed) {
        metadata = currentResults.metadata;
      } else {
        const { generateRandomizationSchema } = await import('../../randomization-engine/core/randomization-algorithm');
        const { computeAuditHash } = await import('../../randomization-engine/core/crypto-hash');
        
        const generatedAt = new Date().toISOString();
        const result = generateRandomizationSchema(config);
        const auditHash = await computeAuditHash(result);
        result.metadata.auditHash = auditHash;
        metadata = result.metadata;
      }
      const code = this.codeGenService.generate(this.activeTab(), config, metadata);
      this.generatedCode.set(code);
    } catch (e) {
      console.error('Error generating code:', e);
      if (e instanceof CodeGenerationError) {
        this.errorState.set(e);
      } else {
        // Wrap unexpected errors in a generic CodeGenerationError so the UI can display them.
        const causeMessage = e instanceof Error
          ? `${e.name}: ${e.message}`
          : String(e);
        const wrapped = new CodeGenerationError(
          `An unexpected error occurred during code generation. ${causeMessage}`,
          config
        );
        this.errorState.set(wrapped);
      }
      this.generatedCode.set('');
    }
  }

  onTabKeydown(event: KeyboardEvent) {
    const tabs: ('R' | 'SAS' | 'Python' | 'STATA')[] = ['R', 'SAS', 'Python', 'STATA'];
    const target = event.target as HTMLElement;
    
    let currentFocusedIndex = tabs.findIndex(t => 'tab-' + t === target.id);
    if (currentFocusedIndex === -1) {
      currentFocusedIndex = tabs.indexOf(this.activeTab());
    }

    let newIndex = currentFocusedIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      newIndex = (currentFocusedIndex + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      newIndex = (currentFocusedIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      newIndex = 0;
    } else if (event.key === 'End') {
      newIndex = tabs.length - 1;
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.setActiveTab(tabs[currentFocusedIndex]);
      return;
    } else {
      return;
    }

    event.preventDefault();
    // Set focus to the new tab button
    setTimeout(() => {
      const btn = document.getElementById('tab-' + tabs[newIndex]);
      if (btn) btn.focus();
    }, 0);
  }

  copyCode() {
    navigator.clipboard.writeText(this.currentCode);
    this.copied.set(true);
    this.announcementService.announce('Copied to clipboard!', 'polite');
    setTimeout(() => this.copied.set(false), 2000);
  }

  copyErrorLog() {
    const err = this.errorState();
    if (!err) return;
    const payload = {
      errorName: err.name,
      message: err.message,
      context: err.context
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    this.announcementService.announce('Copied error log to clipboard!', 'polite');
  }

  downloadCode() {
    const code = this.currentCode;
    const tab = this.activeTab();
    const extension = tab === 'R' ? 'R' : tab === 'SAS' ? 'sas' : tab === 'STATA' ? 'do' : 'py';
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
}
