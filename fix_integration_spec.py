import re

with open('src/app/domain/study-builder/components/config-form.integration.spec.ts', 'r') as f:
    content = f.read()

content = re.sub(
    r"component\.onStepSelectionChange\(\{ selectedIndex: ([\s\S]*?) \}\s*as\s*any\);",
    r"component.setStep(\1);",
    content
)

with open('src/app/domain/study-builder/components/config-form.integration.spec.ts', 'w') as f:
    f.write(content)
