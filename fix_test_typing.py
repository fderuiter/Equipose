import re

with open('src/app/domain/randomization-engine/core/minimization-algorithm.property.spec.ts', 'r') as f:
    content = f.read()

# Replace config with config as unknown as RandomizationConfig in the generated tests
content = re.sub(r"generateMinimization\(config, ([\s\S]*?), new SubjectRegistry\(config\)\)", r"generateMinimization(config as any, \1, new SubjectRegistry(config as any))", content)
content = re.sub(r"generateMinimization\(config, ([\s\S]*?), registry\)", r"generateMinimization(config as any, \1, registry)", content)
content = re.sub(r"new SubjectRegistry\(config\)", r"new SubjectRegistry(config as any)", content)

with open('src/app/domain/randomization-engine/core/minimization-algorithm.property.spec.ts', 'w') as f:
    f.write(content)
