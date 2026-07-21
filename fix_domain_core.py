import os
import re

APP_DIR = '/app/src'

for root, dirs, files in os.walk(APP_DIR):
    for file in files:
        if file.endswith('.ts'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()

            def replace_import(match):
                import_path = match.group(2)
                dir_path = os.path.dirname(filepath)
                resolved = os.path.normpath(os.path.join(dir_path, import_path))
                
                if resolved.startswith('/app/src/app/domain/core'):
                    rel_domain = os.path.relpath(resolved, '/app')
                    return f"import {match.group(1)} from '{rel_domain}';"
                elif resolved.startswith('/app/src/app/domain/randomization-engine/core'):
                    rel_domain = os.path.relpath(resolved, '/app')
                    return f"import {match.group(1)} from '{rel_domain}';"
                return match.group(0)

            new_content = re.sub(r'import\s+(.*?)\s+from\s+[\'"](.*?)[\'"];', replace_import, content, flags=re.DOTALL)
            
            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
