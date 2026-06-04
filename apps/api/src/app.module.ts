import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
// import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
// import { RedisModule } from './redis/redis.module';
// import { QueueModule } from './queue/queue.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SalesModule } from './modules/sales/sales.module';
import { ServicesModule } from './modules/services/services.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { NailDesignsModule } from './modules/nail-designs/nail-designs.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { CashRegisterModule } from './modules/cash-register/cash-register.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AiAgentsModule } from './modules/ai-agents/ai-agents.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UploadModule } from './modules/upload/upload.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { PackagesModule } from './modules/packages/packages.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { CommissionsModule } from './modules/commissions/commissions.module';
import { PlansModule } from './modules/plans/plans.module';
import { StorefrontModule } from './modules/storefront/storefront.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { ImportModule } from './modules/import/import.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { PaymentsModule } from './modules/payments/payments.module';
// import { PayoutsModule } from './modules/payouts/payouts.module'; // TODO: requires platformConfig & platformPayout schema models

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ name: 'global', ttl: 60_000, limit: 120 }]),
    // BullMQ disabled - requires Redis
    // BullModule.forRootAsync({ ... }),
    PrismaModule,
    // RedisModule,
    // QueueModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    InventoryModule,
    SalesModule,
    ServicesModule,
    AppointmentsModule,
    NailDesignsModule,
    CustomersModule,
    SuppliersModule,
    PurchasesModule,
    CashRegisterModule,
    ExpensesModule,
    ReportsModule,
    AiAgentsModule,
    NotificationsModule,
    SettingsModule,
    UploadModule,
    CatalogModule,
    PackagesModule,
    WhatsAppModule,
    TenantModule,
    AccountingModule,
    CommissionsModule,
    PlansModule,
    StorefrontModule,
    MasterDataModule,
    ImportModule,
    MarketingModule,
    PaymentsModule,
    // PayoutsModule, // TODO: requires platformConfig & platformPayout schema models
  ],
  providers: [
    // Apply rate limiting globally — auth endpoints override with stricter limits
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
