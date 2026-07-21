import re

with open('tests_e2e/determinism.spec.ts', 'r') as f:
    text = f.read()

def resolve_det(match):
    head_content = match.group(1)
    return head_content

text = re.sub(r'<<<<<<< HEAD\n(.*?)\n=======\n.*?\n>>>>>>> [^\n]+\n', resolve_det, text, flags=re.DOTALL)

with open('tests_e2e/determinism.spec.ts', 'w') as f:
    f.write(text)
