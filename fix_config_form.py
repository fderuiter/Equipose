import re

with open('src/app/domain/study-builder/components/config-form.component.ts', 'r') as f:
    content = f.read()

# 1. Remove CDK imports
content = re.sub(r"import\s*\{\s*LiveAnnouncer\s*\}\s*from\s*'@angular/cdk/a11y';\n", "", content)
content = re.sub(r"import\s*\{\s*CdkDragDrop,\s*CdkDropList,\s*CdkDrag,\s*CdkDragHandle\s*\}\s*from\s*'@angular/cdk/drag-drop';\n", "", content)
content = re.sub(r"import\s*\{\s*CdkStepperModule,\s*StepperSelectionEvent\s*\}\s*from\s*'@angular/cdk/stepper';\n", "", content)

# 2. Update @Component imports
content = re.sub(
    r"imports:\s*\[ReactiveFormsModule,\s*NgTemplateOutlet,\s*CdkDropList,\s*CdkDrag,\s*CdkDragHandle,\s*CdkStepperModule,\s*TagInputComponent,\s*BlockPreviewComponent,\s*RegulatoryNoticeComponent,\s*A11yValidationDirective,\s*FocusManagerDirective\]",
    "imports: [ReactiveFormsModule, NgTemplateOutlet, TagInputComponent, BlockPreviewComponent, RegulatoryNoticeComponent, A11yValidationDirective, FocusManagerDirective]",
    content
)

# 3. Add drag-and-drop state and stepper state
# Right before "form: FormGroup ="
content = content.replace("  form: FormGroup =", "  readonly currentStepIndex = signal(0);\n  draggedStratumIndex: number | null = null;\n\n  form: FormGroup =")

# 4. Remove `private readonly liveAnnouncer = inject(LiveAnnouncer);`
content = re.sub(r"\s*private readonly liveAnnouncer = inject\(LiveAnnouncer\);\n", "\n", content)

# 5. Add Drag & Drop and Stepper methods
# I will append them at the end of the class

with open('src/app/domain/study-builder/components/config-form.component.ts', 'w') as f:
    f.write(content)
