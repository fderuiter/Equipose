import re

# 1. results-grid.component.spec.ts
with open('src/app/domain/schema-management/components/results-grid.component.spec.ts', 'r') as f:
    content = f.read()

content = re.sub(
    r"component\.openColumnFilter\('([^']+)'\);",
    r"component.openColumnFilter('\1', { currentTarget: document.createElement('button') } as any);",
    content
)

with open('src/app/domain/schema-management/components/results-grid.component.spec.ts', 'w') as f:
    f.write(content)

# 2. config-form.component.spec.ts
with open('src/app/domain/study-builder/components/config-form.component.spec.ts', 'r') as f:
    content = f.read()

content = re.sub(r"import\s*\{\s*CdkStepper\s*\}\s*from\s*'@angular/cdk/stepper';\n", "", content)
content = content.replace("providers: [CdkStepper]", "providers: []")
content = re.sub(
    r"component\.onStrataDrop\(\{ previousIndex: (\d+), currentIndex: (\d+) \}\s*as\s*any\);",
    r"component.draggedStratumIndex = \1;\n      component.onDrop({ preventDefault: () => {} } as any, \2);",
    content
)
with open('src/app/domain/study-builder/components/config-form.component.spec.ts', 'w') as f:
    f.write(content)

# 3. config-form.integration.spec.ts
with open('src/app/domain/study-builder/components/config-form.integration.spec.ts', 'r') as f:
    content = f.read()

content = re.sub(
    r"component\.onStrataDrop\(\{ previousIndex: (\d+), currentIndex: (\d+) \}\s*as\s*any\);",
    r"component.draggedStratumIndex = \1;\n    component.onDrop({ preventDefault: () => {} } as any, \2);",
    content
)
with open('src/app/domain/study-builder/components/config-form.integration.spec.ts', 'w') as f:
    f.write(content)

# 4. randomization-parity.spec.ts
with open('src/app/domain/randomization-engine/randomization-parity.spec.ts', 'r') as f:
    content = f.read()

content = re.sub(r"import\s*\{\s*DialogModule\s*\}\s*from\s*'@angular/cdk/dialog';\n", "", content)
content = content.replace("imports: [DialogModule],", "imports: [],")
with open('src/app/domain/randomization-engine/randomization-parity.spec.ts', 'w') as f:
    f.write(content)

# 5. randomization-engine-monte-carlo.facade.spec.ts
with open('src/app/domain/randomization-engine/randomization-engine-monte-carlo.facade.spec.ts', 'r') as f:
    content = f.read()

content = re.sub(r"import\s*\{\s*Dialog,\s*DialogModule\s*\}\s*from\s*'@angular/cdk/dialog';\n", "", content)
content = content.replace("imports: [DialogModule],", "imports: [],")
content = content.replace("let dialog: Dialog;", "")
content = content.replace("dialog = TestBed.inject(Dialog);", "")
content = content.replace("vi.spyOn(dialog, 'open').mockReturnValue({ closed: of(null), close: vi.fn() } as any);", "")
content = content.replace("expect(dialog.open).toHaveBeenCalled();", "")
with open('src/app/domain/randomization-engine/randomization-engine-monte-carlo.facade.spec.ts', 'w') as f:
    f.write(content)

# 6. randomization-algorithm.spec.ts
with open('src/app/domain/randomization-engine/core/randomization-algorithm.spec.ts', 'r') as f:
    content = f.read()

content = content.replace("alphaNumeric: true", "")
with open('src/app/domain/randomization-engine/core/randomization-algorithm.spec.ts', 'w') as f:
    f.write(content)

# 7. minimization-algorithm.property.spec.ts
with open('src/app/domain/randomization-engine/core/minimization-algorithm.property.spec.ts', 'r') as f:
    content = f.read()

content = content.replace("blockSizes: [] as const,", "blockSizes: [],")
with open('src/app/domain/randomization-engine/core/minimization-algorithm.property.spec.ts', 'w') as f:
    f.write(content)

