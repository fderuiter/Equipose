with open('/app/eslint.config.js', 'r') as f:
    content = f.read()

content = content.replace("'**/core/**',", "")

with open('/app/eslint.config.js', 'w') as f:
    f.write(content)
