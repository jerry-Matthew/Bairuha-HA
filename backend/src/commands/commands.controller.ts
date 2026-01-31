import { Controller, Post, Body, BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandsService } from './commands.service';

@Controller('commands')
export class CommandsController {
    constructor(private readonly commandsService: CommandsService) { }

    @Post()
    async createCommand(@Body() body: { entityId: string; command: string; payload?: Record<string, any> }) {
        const { entityId, command, payload } = body;

        // Validate required fields
        if (!entityId || typeof entityId !== 'string') {
            throw new BadRequestException("Missing or invalid 'entityId' field (must be a string)");
        }

        if (!command || typeof command !== 'string') {
            throw new BadRequestException("Missing or invalid 'command' field (must be a string)");
        }

        // Validate payload if provided
        if (payload !== undefined && (typeof payload !== 'object' || Array.isArray(payload) || payload === null)) {
            throw new BadRequestException("Invalid 'payload' field (must be an object)");
        }

        try {
            const result = await this.commandsService.createCommand(entityId, command, payload || {});
            return result;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(error.message || 'Failed to process command');
        }
    }
}
