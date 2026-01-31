/**
 * HACS Controller
 * 
 * API Endpoints for HACS
 */

import { Controller, Get, Post, Param, Query, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { HacsService } from './hacs.service';
import type {
    HacsCatalogResponse,
    HacsExtensionResponse,
} from './hacs.types';

@Controller('hacs')
export class HacsController {
    constructor(private readonly hacsService: HacsService) { }

    @Get('catalog')
    async getCatalog(
        @Query('q') q?: string,
        @Query('page') page?: string,
        @Query('per_page') perPage?: string
    ): Promise<HacsCatalogResponse> {
        try {
            const pageNum = page ? parseInt(page, 10) : 1;
            const perPageNum = perPage ? parseInt(perPage, 10) : 30;

            const result = await this.hacsService.getEnrichedCatalog(q, pageNum, perPageNum);

            return {
                extensions: result.extensions,
                total: result.total,
                page: result.page,
                perPage: result.perPage,
                totalPages: result.totalPages,
            };
        } catch (error: any) {
            console.error("Error fetching HACS catalog:", error);
            throw new InternalServerErrorException("Failed to fetch catalog");
        }
    }

    @Get('installed-on-ha')
    async getInstalledOnHA() {
        try {
            const components = await this.hacsService.getInstalledIntegrationsFromHA();
            return {
                components,
                count: components.length
            };
        } catch (error: any) {
            console.error('Error fetching installed integrations from HA:', error);
            throw new InternalServerErrorException("Failed to fetch installed integrations");
        }
    }

    @Get(':id')
    async getExtension(@Param('id') id: string): Promise<HacsExtensionResponse> {
        try {
            const details = await this.hacsService.getExtensionDetails(id);
            if (!details) {
                throw new NotFoundException("Extension not found");
            }
            return { extension: details };
        } catch (error: any) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            console.error(`Error fetching extension ${id}:`, error);
            throw new InternalServerErrorException("Failed to fetch extension");
        }
    }

    @Post(':id/install')
    async installExtension(@Param('id') id: string) {
        try {
            const result = await this.hacsService.installExtension(id);
            if (!result.success) {
                throw new BadRequestException(result);
            }
            return result;
        } catch (error: any) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            console.error(`Error installing extension ${id}:`, error);
            throw new InternalServerErrorException("Failed to install extension");
        }
    }

    @Post(':id/update')
    async updateExtension(@Param('id') id: string) {
        try {
            const result = await this.hacsService.updateExtension(id);
            if (!result.success) {
                throw new BadRequestException(result);
            }
            return result;
        } catch (error: any) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            console.error(`Error updating extension ${id}:`, error);
            throw new InternalServerErrorException("Failed to update extension");
        }
    }

    @Post(':id/refresh')
    async refreshExtension(@Param('id') id: string) {
        try {
            const result = await this.hacsService.refreshExtension(id);
            if (!result.success) {
                throw new BadRequestException(result);
            }
            return result;
        } catch (error: any) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            console.error(`Error refreshing extension ${id}:`, error);
            throw new InternalServerErrorException("Failed to refresh extension");
        }
    }
}
