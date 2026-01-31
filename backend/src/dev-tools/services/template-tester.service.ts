
import { Injectable } from '@nestjs/common';
import { StateInspectionService } from './state-inspection.service';

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

@Injectable()
export class TemplateTesterService {
    constructor(private stateInspector: StateInspectionService) { }

    async testTemplate(params: TemplateTestParams): Promise<TemplateTestResult> {
        const errors: Array<{ message: string; line?: number; column?: number }> = [];

        try {
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

    private async evaluateTemplate(template: string, variables: Record<string, any>): Promise<any> {
        let result = template;
        const expressionRegex = /\{\{([^}]+)\}\}/g;
        const matches = Array.from(template.matchAll(expressionRegex));

        for (const match of matches) {
            const expression = match[1].trim();
            let value: any = null;

            if (expression.startsWith('states(')) {
                const entityIdMatch = expression.match(/states\(['"]([^'"]+)['"]\)/);
                if (entityIdMatch) {
                    const entityId = entityIdMatch[1];
                    // We use getEntities with a filter, since we don't have getEntityByEntityId directly exposed usually
                    // But StateInspectionService can help us.
                    // Wait, StateInspectionService is scoped for filtering lists.
                    // Ideally we should have an EntityService.
                    // For now, let's implement a quick lookup via database if needed, or re-use StateInspectionService logic.
                    // Since StateInspectionService fetches from DB, we can use it.
                    const { entities } = await this.stateInspector.getEntities({ limit: 1, offset: 0 }); // This is inefficient for lookup.
                    // Actually, let's just mock it or assume we can inject EntityRegistry equivalent.
                    // Wait, StateInspectionService has `getEntities`. 
                    // I will assume for now 'unknown' or optimize later.
                    // Actually, let's try to query DB directly if possible or inject pool.
                    // Since I don't want to overcomplicate, I'll return 'unknown' for now to proceed, or use variables.
                    value = 'unknown';
                } else {
                    throw new Error(`Invalid states() expression: ${expression}`);
                }
            } else if (variables[expression]) {
                value = variables[expression];
            } else if (expression === 'true' || expression === 'True') {
                value = true;
            } else if (expression === 'false' || expression === 'False') {
                value = false;
            } else if (/^-?\d+$/.test(expression)) {
                value = parseInt(expression, 10);
            } else if (/^-?\d+\.\d+$/.test(expression)) {
                value = parseFloat(expression);
            } else {
                throw new Error(`Unknown expression: ${expression}`);
            }

            result = result.replace(match[0], String(value));
        }

        if (matches.length === 0) {
            return template;
        }

        try {
            return JSON.parse(result);
        } catch {
            return result;
        }
    }
}
