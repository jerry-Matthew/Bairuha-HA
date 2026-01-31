/**
 * Template Tester Service
 * 
 * Provides capabilities to test and validate Home Assistant template expressions
 * for developer tools and debugging.
 * 
 * Note: This is a basic implementation. Full template engine would require
 * Home Assistant's template API or a full Jinja2 parser.
 */

import { getEntityByEntityId } from "@/components/globalAdd/server/entity.registry";

export interface TemplateTestParams {
  template: string;
  variables?: Record<string, any>;
}

export interface TemplateTestResult {
  success: boolean;
  template: string;
  result?: any;
  rendered?: string;
  errors: Array<{ message: string; line?: number; column?: number }>;
}

export interface TemplateValidationResult {
  valid: boolean;
  errors: Array<{ message: string; line?: number; column?: number }>;
}

/**
 * Template Tester Service
 * 
 * Basic template evaluation for Home Assistant templates.
 * Supports:
 * - {{ states('entity_id') }} - Get entity state
 * - {{ variable_name }} - Variable substitution
 * 
 * Full implementation would require Home Assistant's template API or Jinja2 parser.
 */
export class TemplateTester {
  /**
   * Test a template expression
   */
  async testTemplate(params: TemplateTestParams): Promise<TemplateTestResult> {
    const errors: Array<{ message: string; line?: number; column?: number }> = [];

    try {
      // Basic syntax validation
      const openBraces = (params.template.match(/\{\{/g) || []).length;
      const closeBraces = (params.template.match(/\}\}/g) || []).length;

      if (openBraces !== closeBraces) {
        errors.push({
          message: "Mismatched braces: template has unbalanced {{ }} blocks",
        });
        return {
          success: false,
          template: params.template,
          errors,
        };
      }

      // Evaluate template
      const result = await this.evaluateTemplate(params.template, params.variables || {});
      
      return {
        success: true,
        template: params.template,
        result,
        rendered: String(result),
        errors: [],
      };
    } catch (error: any) {
      errors.push({
        message: error.message || "Template evaluation failed",
      });
      return {
        success: false,
        template: params.template,
        errors,
      };
    }
  }

  /**
   * Validate template syntax
   */
  async validateTemplate(template: string): Promise<TemplateValidationResult> {
    const errors: Array<{ message: string; line?: number; column?: number }> = [];

    // Basic syntax validation
    const openBraces = (template.match(/\{\{/g) || []).length;
    const closeBraces = (template.match(/\}\}/g) || []).length;

    if (openBraces !== closeBraces) {
      errors.push({
        message: "Mismatched braces: template has unbalanced {{ }} blocks",
      });
    }

    // Check for unclosed expressions
    const unclosedMatches = template.match(/\{\{[^}]*$/g);
    if (unclosedMatches) {
      errors.push({
        message: "Unclosed template expression",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Evaluate template expression
   * Basic implementation - supports:
   * - {{ states('entity_id') }} - Get entity state
   * - {{ variable_name }} - Variable substitution
   */
  private async evaluateTemplate(
    template: string,
    variables: Record<string, any>
  ): Promise<any> {
    // Replace template expressions
    let result = template;
    const expressionRegex = /\{\{([^}]+)\}\}/g;
    const matches = Array.from(template.matchAll(expressionRegex));

    for (const match of matches) {
      const expression = match[1].trim();
      let value: any = null;

      // Handle states() function
      if (expression.startsWith('states(')) {
        const entityIdMatch = expression.match(/states\(['"]([^'"]+)['"]\)/);
        if (entityIdMatch) {
          const entityId = entityIdMatch[1];
          const entity = await getEntityByEntityId(entityId);
          value = entity?.state || 'unknown';
        } else {
          throw new Error(`Invalid states() expression: ${expression}`);
        }
      }
      // Handle variable substitution
      else if (variables[expression]) {
        value = variables[expression];
      }
      // Handle numeric/boolean literals
      else if (expression === 'true' || expression === 'True') {
        value = true;
      } else if (expression === 'false' || expression === 'False') {
        value = false;
      } else if (/^-?\d+$/.test(expression)) {
        value = parseInt(expression, 10);
      } else if (/^-?\d+\.\d+$/.test(expression)) {
        value = parseFloat(expression);
      }
      // Unknown expression
      else {
        throw new Error(`Unknown expression: ${expression}`);
      }

      result = result.replace(match[0], String(value));
    }

    // If no expressions were found, return the template as-is
    if (matches.length === 0) {
      return template;
    }

    // Try to parse as JSON if it looks like JSON
    try {
      return JSON.parse(result);
    } catch {
      // Return as string
      return result;
    }
  }
}

/**
 * Singleton instance
 */
let templateTester: TemplateTester | null = null;

/**
 * Get or create singleton instance
 */
export function getTemplateTester(): TemplateTester {
  if (!templateTester) {
    templateTester = new TemplateTester();
  }
  return templateTester;
}
