// @ts-check
const eslint = require('@eslint/js');
const {defineConfig} = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');


const customStylePlugin = {
  rules: {
    'no-arbitrary-tailwind': {
      create(context) {
        return {
          TextAttribute(node) {
            if (/-\[/.test(node.value)) context.report({ node, message: 'No arbitrary Tailwind class.' });
          },
          BoundAttribute(node) {
            if (node.value && node.value.source && /-\[/.test(node.value.source)) {
              context.report({ node, message: 'No arbitrary Tailwind class.' });
            }
          }
        };
      }
    },
    'no-inline-style': {
      create(context) {
        return {
          TextAttribute(node) {
            const attrName = node.name;
            if (attrName === 'style' || attrName.startsWith('style.')) {
              context.report({ node, message: 'No inline styles.' });
            }
          },
          BoundAttribute(node) {
            const attrName = node.keySpan && node.keySpan.details ? node.keySpan.details : node.name;
            if (attrName === 'style' || attrName.startsWith('style.')) {
              context.report({ node, message: 'No inline styles.' });
            }
          }
        };
      }
    }
  }
};

module.exports = defineConfig([
  {
    files: ['**/*.ts', '**/*.html'],
    ignores: [
      '**/*schema-analytics-dashboard.component*',
      '**/*block-preview.component*'
    ],
    plugins: {
      'custom-style': customStylePlugin
    },
    rules: {
      'custom-style/no-arbitrary-tailwind': 'error',
      'custom-style/no-inline-style': 'error'
    }
  },

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
    files: ['src/app/domain/study-builder/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['*/domain/randomization-engine/core/*'],
              message:
                'domain/study-builder must not access the randomization-engine core algorithm. ' +
                'Use RandomizationEngineFacade instead.'
            },
            {
              group: ['*/domain/randomization-engine/worker/*'],
              message:
                'domain/study-builder must not access the randomization-engine worker internals. ' +
                'Use RandomizationEngineFacade instead.'
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
  }
]);
