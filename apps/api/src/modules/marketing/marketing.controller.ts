import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { MarketingService } from './marketing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateCampaignDto, UpdateCampaignDto, ReviewCampaignDto, ProposeAiCampaignDto } from './dto/marketing.dto';

@ApiTags('Marketing')
@Controller('marketing')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class MarketingController {
  constructor(private service: MarketingService) {}

  @Get()
  @ApiOperation({ summary: 'List campaigns with filters' })
  findAll(
    @TenantId() t: string,
    @StoreId() s: string,
    @Query() q: PaginationDto & { status?: string; type?: string; search?: string },
  ) {
    return this.service.findAll(t, s, q);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Campaign summary stats' })
  stats(@TenantId() t: string, @StoreId() s: string) {
    return this.service.getStats(t, s);
  }

  @Get('proposals')
  @ApiOperation({ summary: 'List pending AI proposals' })
  proposals(@TenantId() t: string, @StoreId() s: string) {
    return this.service.getPendingProposals(t, s);
  }

  @Get(':id')
  findOne(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) {
    return this.service.findOne(t, s, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create campaign manually' })
  create(
    @TenantId() t: string,
    @StoreId() s: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.service.create(t, s, userId, dto);
  }

  @Post('ai-propose')
  @ApiOperation({ summary: 'AI agent proposes a campaign for review' })
  proposeByAi(
    @TenantId() t: string,
    @StoreId() s: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ProposeAiCampaignDto,
  ) {
    return this.service.proposeByAi(t, s, userId, dto);
  }

  @Put(':id')
  update(
    @TenantId() t: string,
    @StoreId() s: string,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.service.update(t, s, id, dto);
  }

  @Patch(':id/review')
  @ApiOperation({ summary: 'Accept or reject an AI-proposed campaign' })
  review(
    @TenantId() t: string,
    @StoreId() s: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReviewCampaignDto,
  ) {
    return this.service.review(t, s, id, userId, dto);
  }

  @Patch(':id/launch')
  @ApiOperation({ summary: 'Launch a draft or scheduled campaign' })
  launch(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) {
    return this.service.launch(t, s, id);
  }

  @Patch(':id/pause')
  pause(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) {
    return this.service.pause(t, s, id);
  }

  @Patch(':id/complete')
  complete(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) {
    return this.service.complete(t, s, id);
  }

  @Patch(':id/cancel')
  cancel(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) {
    return this.service.cancel(t, s, id);
  }

  @Delete(':id')
  remove(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) {
    return this.service.remove(t, s, id);
  }
}
