import os
import re

APP_DIR = '/app/src'
CORE_DIR = '/app/src/app/core'

for root, dirs, files in os.walk(APP_DIR):
    for file in files:
        if file.endswith('.ts'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()

            def replace_import(match):
                import_path = match.group(2)
                # Only process relative imports
                if not import_path.startswith('.'):
                    return match.group(0)
                
                dir_path = os.path.dirname(filepath)
                resolved = os.path.normpath(os.path.join(dir_path, import_path))
                
                if resolved.startswith('/app/src/app/domain/core'):
                    rel_domain = os.path.relpath(resolved, '/app')
                    return f"import {match.group(1)} from '{rel_domain}';"
                elif resolved.startswith('/app/src/app/domain/randomization-engine/core'):
                    rel_domain = os.path.relpath(resolved, '/app')
                    return f"import {match.group(1)} from '{rel_domain}';"
                elif resolved.startswith(CORE_DIR):
                    rel_core = os.path.relpath(resolved, CORE_DIR)
                    if rel_core == '.':
                        return f"import {match.group(1)} from '@core';"
                    
                    # Ensure path separator is '/'
                    rel_core = rel_core.replace(os.sep, '/')
                    return f"import {match.group(1)} from '@core/{rel_core}';"
                return match.group(0)

            # Use re.DOTALL to match multi-line imports
            new_content = re.sub(r'import\s+(.*?)\s+from\s+[\'"](.*?)[\'"];', replace_import, content, flags=re.DOTALL)
            
            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
