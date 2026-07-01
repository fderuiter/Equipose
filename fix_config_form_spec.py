import re

with open('src/app/domain/study-builder/components/config-form.component.spec.ts', 'r') as f:
    content = f.read()

# Replace onStepSelectionChange({ selectedIndex: ... } as any) with setStep(...)
content = re.sub(
    r"component\.onStepSelectionChange\(\{ selectedIndex: ([\s\S]*?) \}\s*as\s*any\);",
    r"component.setStep(\1);",
    content
)

# Replace querySelector('button[cdkStepperNext]') with something else
# There's multiple 'Next' buttons. The test `goToAllocationStep` clicks next 4 times.
# We can just call component.nextStep()
content = re.sub(
    r"const nextButton = fixture\.nativeElement\.querySelector\('button\[cdkStepperNext\]'\);\n\s*nextButton\.click\(\);",
    "component.nextStep();",
    content
)

with open('src/app/domain/study-builder/components/config-form.component.spec.ts', 'w') as f:
    f.write(content)
