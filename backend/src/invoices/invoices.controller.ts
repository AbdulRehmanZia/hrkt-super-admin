import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.invoicesService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      status,
      search,
    });
  }

  @Get(':id/breakdown')
  async getBreakdown(@Param('id') id: string) {
    return this.invoicesService.getBreakdown(id);
  }

  @Post(':id/reminder')
  async sendReminder(@Param('id') id: string, @Request() req: any) {
    const superAdminEmail = req.user?.email || 'admin@hrkt.io';
    return this.invoicesService.sendReminder(id, superAdminEmail);
  }

  @Patch(':id/pay')
  async markAsPaid(@Param('id') id: string, @Request() req: any) {
    const superAdminEmail = req.user?.email || 'admin@hrkt.io';
    return this.invoicesService.markAsPaid(id, superAdminEmail);
  }
}
