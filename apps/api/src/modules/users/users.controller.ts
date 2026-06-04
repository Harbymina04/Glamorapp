import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UpdatePermissionsDto } from './dto/user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles('store_admin', 'tenant_admin')
  findAll(
    @TenantId() tenantId: string,
    @Query() query: PaginationDto & { role?: string; isActive?: boolean },
    @Request() req: any,
  ) {
    // store_admin only sees users in their own store
    const storeId = req.user.role === 'store_admin' ? req.user.storeId : null;
    return this.usersService.findAll(tenantId, query, storeId);
  }

  @Get(':id')
  @Roles('store_admin', 'tenant_admin')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.usersService.findOne(tenantId, id);
  }

  @Post()
  @Roles('store_admin', 'tenant_admin')
  create(@TenantId() tenantId: string, @Body() dto: CreateUserDto, @Request() req: any) {
    // store_admin can only create users in their own store
    if (req.user.role === 'store_admin') {
      dto.storeId = req.user.storeId;
    }
    return this.usersService.create(tenantId, dto);
  }

  @Put(':id')
  @Roles('store_admin', 'tenant_admin')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('store_admin', 'tenant_admin')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.usersService.remove(tenantId, id);
  }

  @Put(':id/permissions')
  @Roles('store_admin', 'tenant_admin')
  updatePermissions(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePermissionsDto,
  ) {
    return this.usersService.updatePermissions(tenantId, id, dto.permissions);
  }

  @Get(':id/permissions')
  @Roles('store_admin', 'tenant_admin')
  getPermissions(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.usersService.findOne(tenantId, id);
  }
}
