import re

with open('src/app/domain/study-builder/components/config-form.component.ts', 'r') as f:
    content = f.read()

# Remove onStrataDrop
content = re.sub(r"  onStrataDrop\(event: CdkDragDrop<FormGroup\[\]>\): void \{[\s\S]*?\}\n", "", content)

# Modify onStepSelectionChange(event: StepperSelectionEvent) to (selectedIndex: number)
content = re.sub(r"onStepSelectionChange\(event: StepperSelectionEvent\): void \{", "onStepSelectionChange(selectedIndex: number): void {", content)
content = re.sub(r"event\.selectedIndex", "selectedIndex", content)

# Remove liveAnnouncer calls
content = re.sub(r"this\.liveAnnouncer\.announce\([^)]+\);", "", content)

with open('src/app/domain/study-builder/components/config-form.component.ts', 'w') as f:
    f.write(content)
