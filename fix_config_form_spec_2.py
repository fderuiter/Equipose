import re

with open('src/app/domain/study-builder/components/config-form.component.spec.ts', 'r') as f:
    content = f.read()

content = re.sub(
    r"const nextButton = fixture\.nativeElement\.querySelector\('button\[cdkStepperNext\]'\) as HTMLButtonElement;\n\s*nextButton\.click\(\);",
    r"component.nextStep();",
    content
)

with open('src/app/domain/study-builder/components/config-form.component.spec.ts', 'w') as f:
    f.write(content)
