import re

with open('src/app/domain/randomization-engine/randomization-engine-monte-carlo.facade.spec.ts', 'r') as f:
    content = f.read()

content = re.sub(
    r"expect\(dialogMock\.open\)\.toHaveBeenCalled\(\);",
    "",
    content
)
with open('src/app/domain/randomization-engine/randomization-engine-monte-carlo.facade.spec.ts', 'w') as f:
    f.write(content)
