import { Controller, Get, Put, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  findAll(@TenantId() t: string, @CurrentUser('id') u: string, @Query() q: any) { return this.service.findAll(t, u, q); }

  @Get('unread-count')
  unreadCount(@TenantId() t: string, @CurrentUser('id') u: string) { return this.service.unreadCount(t, u); }

  @Put(':id/read')
  markRead(@Param('id') id: string) { return this.service.markRead(id); }

  @Put('read-all')
  markAllRead(@TenantId() t: string, @CurrentUser('id') u: string) { return this.service.markAllRead(t, u); }
}
