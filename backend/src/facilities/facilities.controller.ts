import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FacilitiesService } from './facilities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { UpdateCourtLimitDto } from './dto/update-court-limit.dto';
import { UpdateAdminCredentialsDto } from './dto/update-admin-credentials.dto';
import { UpdateFacilityStatusDto } from './dto/update-facility-status.dto';

@UseGuards(JwtAuthGuard)
@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Post()
  async create(@Body() createFacilityDto: CreateFacilityDto) {
    return this.facilitiesService.create(createFacilityDto);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('subscriptionStatus') subscriptionStatus?: string,
    @Query('search') search?: string,
  ) {
    return this.facilitiesService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      status,
      subscriptionStatus,
      search,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.facilitiesService.findOne(id);
  }

  @Patch(':id')
  async updateFacility(
    @Param('id') id: string,
    @Body() dto: UpdateFacilityDto,
    @Request() req: any,
  ) {
    const superAdminEmail = req.user?.email || 'admin@hrkt.io';
    return this.facilitiesService.updateFacility(id, dto, superAdminEmail);
  }

  @Patch(':id/court-limit')
  async updateCourtLimit(
    @Param('id') id: string,
    @Body() dto: UpdateCourtLimitDto,
    @Request() req: any,
  ) {
    const superAdminEmail = req.user?.email || 'admin@hrkt.io';
    return this.facilitiesService.updateCourtLimit(id, dto, superAdminEmail);
  }

  @Patch(':id/admin-credentials')
  async updateAdminCredentials(
    @Param('id') id: string,
    @Body() dto: UpdateAdminCredentialsDto,
    @Request() req: any,
  ) {
    const superAdminEmail = req.user?.email || 'admin@hrkt.io';
    return this.facilitiesService.updateAdminCredentials(id, dto, superAdminEmail);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFacilityStatusDto,
    @Request() req: any,
  ) {
    const superAdminEmail = req.user?.email || 'admin@hrkt.io';
    return this.facilitiesService.updateStatus(id, dto, superAdminEmail);
  }

  @Get(':id/bookings')
  async findBookings(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ) {
    return this.facilitiesService.findBookings(id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      paymentStatus,
    });
  }

  @Get(':id/customers')
  async findCustomers(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.facilitiesService.findCustomers(id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search,
    });
  }
}
