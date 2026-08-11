export interface SASNode {
  type: 'Macro' | 'Loop' | 'Assignment' | 'Statement';
  name?: string;
  line: number;
  content: string;
  children?: SASNode[];
}

export interface StataNode {
  type: 'MataBlock' | 'Loop' | 'If' | 'Command';
  line: number;
  content: string;
  children?: StataNode[];
}

export class ASTValidator {
  /**
   * Parses SAS code into a tree of nodes.
   */
  static parseSAS(code: string): SASNode[] {
    const root: SASNode[] = [];
    const stack: SASNode[][] = [root];
    
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const rawLine = lines[i];
      const line = rawLine.trim();
      
      // Skip comments
      if (line.startsWith('/*') && line.endsWith('*/')) continue;
      if (line.startsWith('*') && line.endsWith(';')) continue;
      if (line === '') continue;
      
      if (line.startsWith('%macro')) {
        const match = line.match(/%macro\s+(\w+)(?:\((.*?)\))?/i);
        const name = match ? match[1] : 'unknown';
        const node: SASNode = {
          type: 'Macro',
          name,
          line: lineNum,
          content: line,
          children: []
        };
        stack[stack.length - 1].push(node);
        stack.push(node.children!);
      } else if (line.startsWith('%mend')) {
        if (stack.length > 1) {
          stack.pop();
        }
      } else if (line.match(/^do\s+\w+\s*=/i) || line.match(/^do\s+while/i)) {
        const node: SASNode = {
          type: 'Loop',
          line: lineNum,
          content: line,
          children: []
        };
        stack[stack.length - 1].push(node);
        stack.push(node.children!);
      } else if (line === 'end;') {
        if (stack.length > 1) {
          stack.pop();
        }
      } else if (line.startsWith('%let') || line.includes('=')) {
        stack[stack.length - 1].push({
          type: 'Assignment',
          line: lineNum,
          content: line
        });
      } else {
        stack[stack.length - 1].push({
          type: 'Statement',
          line: lineNum,
          content: line
        });
      }
    }
    return root;
  }

  /**
   * Parses Stata code into a tree of nodes.
   */
  static parseStata(code: string): StataNode[] {
    const root: StataNode[] = [];
    const stack: StataNode[][] = [root];
    
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const rawLine = lines[i];
      const line = rawLine.trim();
      
      // Skip comments
      if (line.startsWith('*') || line.startsWith('//')) continue;
      if (line === '') continue;
      
      if (line.startsWith('mata:')) {
        const node: StataNode = {
          type: 'MataBlock',
          line: lineNum,
          content: line,
          children: []
        };
        stack[stack.length - 1].push(node);
        stack.push(node.children!);
      } else if (line === 'end' && stack.length > 1) {
        stack.pop();
      } else if (line.startsWith('for') || line.startsWith('while')) {
        const node: StataNode = {
          type: 'Loop',
          line: lineNum,
          content: line,
          children: []
        };
        stack[stack.length - 1].push(node);
        stack.push(node.children!);
      } else if (line.startsWith('if') || line.includes(' if ')) {
        const node: StataNode = {
          type: 'If',
          line: lineNum,
          content: line,
          children: []
        };
        stack[stack.length - 1].push(node);
        stack.push(node.children!);
      } else if (line === '}') {
        if (stack.length > 1) {
          stack.pop();
        }
      } else {
        stack[stack.length - 1].push({
          type: 'Command',
          line: lineNum,
          content: line
        });
      }
    }
    return root;
  }

  /**
   * Validates SAS code AST and symbols.
   */
  static validateSAS(code: string, strata?: string[]): string[] {
    const errors: string[] = [];
    const rootNodes = this.parseSAS(code);
    
    // Symbolic evaluation
    const symbols = new Set<string>([
      'seed', 'p_minimization', 'block_sizes', 'strata_factors', 'arms', 'arms_names',
      '_N_', '_ERROR_', 'i', 'j', 'k', 'idx', 'temp', 'size', 'size_idx', 'rand_int', 'mti'
    ]);
    
    // Check if block comment count balances
    let commentDepth = 0;
    for (let i = 0; i < code.length - 1; i++) {
      if (code[i] === '/' && code[i + 1] === '*') commentDepth++;
      if (code[i] === '*' && code[i + 1] === '/') commentDepth--;
    }
    if (commentDepth !== 0) {
      errors.push(`Block comments are unbalanced: ${commentDepth > 0 ? 'unclosed' : 'extra closing'} comment blocks.`);
    }

    const traverse = (nodes: SASNode[], inMacroScope = false) => {
      for (const node of nodes) {
        if (node.type === 'Macro') {
          // Verify macro structure
          if (!node.name || node.name === 'unknown') {
            errors.push(`Line ${node.line}: SAS macro declared without a valid identifier.`);
          }
          // Scan for uninitialized stratification levels in macro declaration/compile
          if (strata && strata.length > 0) {
            for (const stratum of strata) {
              const levelLetPattern = new RegExp(`%let\\s+${stratum}_levels\\s*=`, 'i');
              const levelLetMatch = code.match(levelLetPattern);
              if (!levelLetMatch) {
                errors.push(`Line ${node.line}: SAS macro "${node.name}" is declared but stratification factor "${stratum}" levels are uninitialized.`);
              }
            }
          }
          traverse(node.children || [], true);
        } else if (node.type === 'Loop') {
          // Loop limit validation (prevent uninitialized path / bounds issues)
          const limitMatch = node.content.match(/to\s+([a-zA-Z_]\w*)/i);
          if (limitMatch) {
            const limitVar = limitMatch[1];
            if (!symbols.has(limitVar) && isNaN(Number(limitVar))) {
              errors.push(`Line ${node.line}: SAS loop limit variable "${limitVar}" is uninitialized.`);
            }
          }
          traverse(node.children || [], inMacroScope);
        } else if (node.type === 'Assignment') {
          const match = node.content.match(/%let\s+(\w+)\s*=\s*(.*);/i) || node.content.match(/(\w+)\s*=\s*(.*);/i);
          if (match) {
            const varName = match[1];
            const expr = match[2].trim();
            
            // Uninitialized macro or variables
            if (node.content.startsWith('%let') && expr === '') {
              // If it's a stratum levels assignment, it is uninitialized stratification levels
              if (strata && strata.some(s => varName.toLowerCase().startsWith(s.toLowerCase()))) {
                errors.push(`Line ${node.line}: SAS macro variable "${varName}" for stratification levels is uninitialized (assigned empty value).`);
              } else {
                errors.push(`Line ${node.line}: SAS macro variable "${varName}" is uninitialized.`);
              }
            }
            
            // Check references in expression
            const refRegex = /&([a-zA-Z_]\w*)\b/g;
            let refMatch;
            while ((refMatch = refRegex.exec(expr)) !== null) {
              const refVar = refMatch[1];
              if (!symbols.has(refVar)) {
                errors.push(`Line ${node.line}: Reference to uninitialized macro variable "&${refVar}" in expression.`);
              }
            }
            
            symbols.add(varName);
          }
        }
        
        // Array access safety / buffer overflow checks (applies to all node types)
        const blkAccessMatch = node.content.match(/blk\s*\[\s*([^\]]+)\s*\]/gi);
        if (blkAccessMatch) {
          for (const access of blkAccessMatch) {
            const varMatch = access.match(/blk\s*\[\s*(\w+)\s*\]/i);
            if (varMatch) {
              const idxVar = varMatch[1];
              if (!symbols.has(idxVar) && isNaN(Number(idxVar))) {
                errors.push(`Line ${node.line}: SAS array block index "${idxVar}" is uninitialized.`);
              }
            }
          }
        }
      }
    };
    
    traverse(rootNodes);
    return errors;
  }

  /**
   * Validates Stata code AST and symbols.
   */
  static validateStata(code: string, strata?: string[]): string[] {
    const errors: string[] = [];
    const rootNodes = this.parseStata(code);
    
    const checkLength = (name: string, line: number, type: string) => {
      if (name.length > 32) {
        errors.push(`Line ${line}: Stata ${type} identifier "${name}" has length ${name.length}, which exceeds the 32-character limit.`);
      }
    };

    const traverse = (nodes: StataNode[]) => {
      for (const node of nodes) {
        const lineNum = node.line;
        const content = node.content;

        // Check for 32-character limit on identifiers
        // Extract local macros
        const localMatches = content.matchAll(/local\s+(\w+)/gi);
        for (const match of localMatches) {
          checkLength(match[1], lineNum, 'local macro');
        }

        // Extract global macros
        const globalMatches = content.matchAll(/global\s+(\w+)/gi);
        for (const match of globalMatches) {
          checkLength(match[1], lineNum, 'global macro');
        }

        // Extract generated variables
        const genMatches = content.matchAll(/(?:gen|generate)\s+(?:str\d+|double|float|long|int|byte)?\s*(\w+)/gi);
        for (const match of genMatches) {
          checkLength(match[1], lineNum, 'variable');
        }

        // Extract temporary variables
        const tempvarMatches = content.matchAll(/tempvar\s+(\w+)/gi);
        for (const match of tempvarMatches) {
          checkLength(match[1], lineNum, 'tempvar');
        }

        // Extract Mata variables
        const mataMatches = content.matchAll(/(?:string|real|void)\s+(?:scalar|rowvector|colvector|matrix)?\s*(\w+)/gi);
        for (const match of mataMatches) {
          if (!['scalar', 'rowvector', 'colvector', 'matrix'].includes(match[1])) {
            checkLength(match[1], lineNum, 'Mata variable');
          }
        }

        // Extract string literals in st_addvar / st_sstore
        const addVarMatches = content.matchAll(/st_addvar\("[^"]+",\s*"([^"]+)"\)/gi);
        for (const match of addVarMatches) {
          checkLength(match[1], lineNum, 'st_addvar variable');
        }

        const sstoreMatches = content.matchAll(/st_sstore\(.*,\s*"([^"]+)"/gi);
        for (const match of sstoreMatches) {
          checkLength(match[1], lineNum, 'st_sstore variable');
        }

        // Check Missing Value Math Routing on If/Loop conditions
        if (node.type === 'If' || node.type === 'Loop') {
          const condMatch = content.match(/(?:if|while)\s*\((.*?)\)/i) || content.match(/if\s+(.*)/i);
          if (condMatch) {
            const condition = condMatch[1];
            // Check for comparison operators
            const compRegex = /\b([a-zA-Z_]\w*)\s*([<>]=?)\s*([^&| \t\n\r)]+)/g;
            let match;
            while ((match = compRegex.exec(condition)) !== null) {
              const varName = match[1];
              const isStratum = strata && strata.some(s => {
                const sLower = s.toLowerCase();
                const vLower = varName.toLowerCase();
                const sanitizedS = sLower.replace(/[^a-z0-9_]/g, '_');
                return sLower === vLower || sanitizedS === vLower;
              });

              if (isStratum) {
                const missingCheck1 = `!missing(${varName})`;
                const missingCheck2 = `missing(${varName}) == 0`;
                const missingCheck3 = `${varName} < .`;
                const missingCheck4 = `${varName} != .`;
                if (!condition.includes(missingCheck1) &&
                    !condition.includes(missingCheck2) &&
                    !condition.includes(missingCheck3) &&
                    !condition.includes(missingCheck4)) {
                  errors.push(`Line ${lineNum}: Stata condition "${condition.trim()}" compares variable "${varName}" without checking for missing value boundary.`);
                }
              }
            }
          }
        }

        if (node.children) {
          traverse(node.children);
        }
      }
    };

    traverse(rootNodes);
    return errors;
  }
}
