
import { Controller, Get, Post, Body, Put, Param, Delete, Patch } from '@nestjs/common';
import { DashboardsService } from './dashboards.service';
import { Dashboard } from './entities/dashboard.entity';
import { DashboardCard } from './entities/dashboard-card.entity';

@Controller('dashboards')
export class DashboardsController {
    constructor(private readonly dashboardsService: DashboardsService) { }

    @Get()
    findAll() {
        return this.dashboardsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.dashboardsService.findOne(id);
    }

    @Post()
    create(@Body() data: Partial<Dashboard>) {
        return this.dashboardsService.create(data);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() data: Partial<Dashboard>) {
        return this.dashboardsService.update(id, data);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.dashboardsService.remove(id);
    }

    // --- Cards ---

    @Get(':id/cards')
    getCards(@Param('id') id: string) {
        return this.dashboardsService.getDashboardCards(id);
    }

    @Post(':id/cards')
    addCard(@Param('id') id: string, @Body() data: Partial<DashboardCard>) {
        return this.dashboardsService.addCard(id, data);
    }

    @Patch(':id/cards/:cardId')
    updateCard(@Param('cardId') cardId: string, @Body() data: Partial<DashboardCard>) {
        return this.dashboardsService.updateCard(cardId, data);
    }

    @Delete(':id/cards/:cardId')
    removeCard(@Param('cardId') cardId: string) {
        return this.dashboardsService.deleteCard(cardId);
    }

    @Put(':id/reorder')
    reorderCards(@Param('id') id: string, @Body('cardIds') cardIds: string[]) {
        return this.dashboardsService.reorderCards(id, cardIds);
    }
}
