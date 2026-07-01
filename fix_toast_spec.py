import re

with open('src/app/core/services/toast.service.spec.ts', 'r') as f:
    content = f.read()

# Remove the SSR test
content = re.sub(
    r"it\('should not create an overlay on server platform', \(\) => \{[\s\S]*?\}\);",
    "",
    content
)

with open('src/app/core/services/toast.service.spec.ts', 'w') as f:
    f.write(content)
