
import { Injectable } from '@nestjs/common';
import * as yaml from 'js-yaml';

@Injectable()
export class YamlValidatorService {
    async validateYAML(yamlString: string): Promise<any> {
        const errors: any[] = [];
        const warnings: any[] = [];
        let data = null;

        try {
            data = yaml.load(yamlString, {
                onWarning: (warning) => {
                    warnings.push({
                        message: warning.message,
                        line: warning.mark.line,
                    });
                },
            });
            return { valid: true, errors: [], warnings, data };
        } catch (error: any) {
            return {
                valid: false,
                errors: [{
                    message: error.message,
                    line: error.mark?.line,
                    column: error.mark?.column
                }],
                warnings,
                data: null
            };
        }
    }
}
