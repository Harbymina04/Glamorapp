import {
  Controller, Get, Post, Param, Body,
  Headers, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipSubscriptionCheck } from '../../common/decorators/skip-subscription.decorator';
import { PaymentsService, CreatePseTransactionDto } from './payments.service';

@ApiTags('Payments')
@SkipSubscriptionCheck()
@Controller('payments')
export class PaymentsController {
  constructor(private service: PaymentsService) {}

  /**
   * GET /payments/pse/banks
   * Returns the list of PSE financial institutions from Wompi.
   * Public — no auth required.
   */
  @Get('pse/banks')
  @ApiOperation({ summary: 'List PSE banks (Wompi)' })
  getPseBanks() {
    return this.service.getPseBanks();
  }

  /**
   * POST /payments/pse/create
   * Creates a PSE transaction in Wompi and returns the bank redirect URL.
   * Public — called by the storefront checkout after the order is created.
   */
  @Post('pse/create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create PSE transaction' })
  createPse(@Body() dto: CreatePseTransactionDto) {
    return this.service.createPseTransaction(dto);
  }

  /**
   * GET /payments/status/:transactionId
   * Polls a Wompi transaction status.
   * Public — called by the result page after the bank redirect.
   */
  @Get('status/:transactionId')
  @ApiOperation({ summary: 'Get Wompi transaction status' })
  getStatus(@Param('transactionId') id: string) {
    return this.service.getTransactionStatus(id);
  }

  /**
   * POST /payments/webhook
   * Receives Wompi event notifications.
   * Public — Wompi posts here; we verify the checksum internally.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Wompi webhook receiver' })
  webhook(
    @Body() payload: any,
    @Headers('x-event-checksum') checksum: string,
  ) {
    return this.service.handleWebhook(payload, checksum);
  }
}
