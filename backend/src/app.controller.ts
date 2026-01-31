import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('restart')
  restart() {
    setTimeout(() => {
      console.log('Restart triggered via API...');
      process.exit(1);
    }, 1000);
    return { status: 'restarting', message: 'Server is restarting...' };
  }
}
