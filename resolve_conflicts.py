import re

with open('src/app/domain/schema-management/components/code-generator-modal.component.html', 'r') as f:
    text = f.read()

# We just want to use the HEAD version (which has disabled="...") but change attr.aria-checked to ariaChecked
def resolve_code_gen(match):
    head_content = match.group(1)
    return head_content.replace('[attr.aria-checked]', '[ariaChecked]')

text = re.sub(r'<<<<<<< HEAD\n(.*?)\n=======\n.*?\n>>>>>>> [^\n]+\n', resolve_code_gen, text, flags=re.DOTALL)

with open('src/app/domain/schema-management/components/code-generator-modal.component.html', 'w') as f:
    f.write(text)

with open('src/app/domain/study-builder/components/config-form.component.html', 'r') as f:
    text2 = f.read()

def resolve_config_form(match):
    head_content = match.group(1)
    return head_content.replace('[attr.aria-checked]', '[ariaChecked]').replace('[attr.aria-label]', '[ariaLabel]')

text2 = re.sub(r'<<<<<<< HEAD\n(.*?)\n=======\n.*?\n>>>>>>> [^\n]+\n', resolve_config_form, text2, flags=re.DOTALL)

with open('src/app/domain/study-builder/components/config-form.component.html', 'w') as f:
    f.write(text2)

with open('tests_e2e/determinism.spec.ts', 'r') as f:
    text3 = f.read()

# For determinism, HEAD is likely the correct one or we just need my hash.
# Let's read it to see.
