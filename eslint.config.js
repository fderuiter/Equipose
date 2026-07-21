// @ts-check
const eslint = require('@eslint/js');
const {defineConfig} = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@angular-eslint/no-output-on-prefix': 'off',
      'no-empty': 'off',
      '@typescript-eslint/class-literal-property-style': 'off',
      '@angular-eslint/no-input-rename': 'off',
      '@angular-eslint/use-lifecycle-interface': 'off',
      '@angular-eslint/prefer-inject': 'off',
      'no-useless-assignment': 'off',
      '@angular-eslint/directive-selector': 'off',
      'prefer-const': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@angular-eslint/component-selector': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/prefer-for-of': 'off',
      'no-useless-escape': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off',
      '@angular-eslint/template/click-events-have-key-events': 'off',
    },
  },

  // ---------------------------------------------------------------------------
  // Phase 2 (Ticket 19.B): Strict Domain Boundary Enforcement
  //
  // Rule 1 – domain/study-builder (UI) must never import from the
  //          randomization-engine internals.  Only the facade is permitted
  //          as the entry point, plus domain/core models.
  // ---------------------------------------------------------------------------
  {
    files: ['src/app/domain/study-builder/**/*.ts', 'src/app/domain/schema-management/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['*/domain/randomization-engine/core/*', '@domain/randomization-engine/core/*'],
              message:
                'UI domains must not access the randomization-engine core algorithm directly. ' +
                'Use RandomizationEngineFacade instead.'
            },
            {
              group: ['*/domain/randomization-engine/worker/*', '@domain/randomization-engine/worker/*'],
              message:
                'UI domains must not access the randomization-engine worker internals. ' +
                'Use RandomizationEngineFacade instead.'
            },
            {
              group: [
                
                '../core/**',
                '../../core/**',
                '../../../core/**',
                '../../../../core/**',
                './core/**'
              ],
              message: 'Direct relative imports to core directories are not allowed. Please use the "@core" alias instead.'
            }
          ]
        }
      ]
    }
  },

  {
    files: ['**/*.ts'],
    ignores: ['src/app/core/**/*.ts', 'src/app/domain/study-builder/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                
                '../core/**',
                '../../core/**',
                '../../../core/**',
                '../../../../core/**',
                './core/**'
              ],
              message: 'Direct relative imports to core directories are not allowed. Please use the "@core" alias instead.'
            }
          ]
        }
      ]
    }
  },

  // Rule 2 – domain/randomization-engine/core (pure algorithm) must remain
  //          free of all Angular dependencies so it is safe to import inside
  //          Web Workers and server-side rendering contexts.
  {
    files: ['src/app/domain/randomization-engine/core/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@angular/*'],
              message:
                'The randomization-engine core algorithm must be pure TypeScript with no Angular dependencies. ' +
                'It must be usable inside Web Workers and SSR.'
            },
            {
              group: [
                
                '../core/**',
                '../../core/**',
                '../../../core/**',
                '../../../../core/**',
                './core/**'
              ],
              message: 'Direct relative imports to core directories are not allowed. Please use the "@core" alias instead.'
            }
          ]
        }
      ]
    }
  },

  {
    files: ['**/*.html'],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {
      '@angular-eslint/template/interactive-supports-focus': 'off',
      '@angular-eslint/template/click-events-have-key-events': 'off',
    },
  },
  {
    files: ['src/app/domain/**/*.html'],
    plugins: {
      'custom-template-rules': {
        rules: {
          'no-raw-html-elements': {
            create(context) {
              return {
                'Element[name="button"]'(node) {
                  context.report({ node, message: 'Use <app-button> standard component instead of raw <button> tags.' });
                },
                'Element[name="input"]'(node) {
                  const typeAttr = node.attributes?.find(attr => attr.name === 'type');
                  const type = typeAttr ? typeAttr.value : undefined;
                  if (!type || type === 'text') {
                    context.report({ node, message: 'Use <app-text-input> standard component instead of raw text <input> tags.' });
                  }
                }
              };
            }
          }
        }
      }
    },
    rules: {
      'custom-template-rules/no-raw-html-elements': 'error'
    }
  }
]);
