import re

# 1. randomization-engine-monte-carlo.facade.spec.ts
with open('src/app/domain/randomization-engine/randomization-engine-monte-carlo.facade.spec.ts', 'r') as f:
    content = f.read()

content = content.replace("{ provide: Dialog, useValue: dialogMock }", "")
content = content.replace("const dialogMock = { open: vi.fn() };", "")
with open('src/app/domain/randomization-engine/randomization-engine-monte-carlo.facade.spec.ts', 'w') as f:
    f.write(content)

# 2. minimization-algorithm.property.spec.ts
with open('src/app/domain/randomization-engine/core/minimization-algorithm.property.spec.ts', 'r') as f:
    content = f.read()

content = content.replace("blockSizes: [],", "blockSizes: [] as number[],")
with open('src/app/domain/randomization-engine/core/minimization-algorithm.property.spec.ts', 'w') as f:
    f.write(content)

