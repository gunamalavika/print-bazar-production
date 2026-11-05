import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  PaymentsService,
  CreatePaymentIntentDto,
  VerifyPaymentDto,
  ManualPaymentDto,
  FinanceBoardFiltersDto,
} from './payments.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { Roles, CurrentUser } from '../../common/decorators/auth.decorator';
import { UserRole, JwtPayload } from '../../common/types/roles';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('board')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ACCOUNTS, UserRole.ADMIN_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get live Finance & Accounts Kanban board data and metrics' })
  async getFinanceBoard(
    @Query('search') search?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('method') method?: string,
    @Query('priority') priority?: string,
  ) {
    return this.paymentsService.getFinanceBoard({
      search,
      paymentStatus,
      method,
      priority,
    });
  }

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Razorpay payment intent for an order' })
  async createIntent(
    @Body() body: CreatePaymentIntentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.createPaymentIntent(body, user?.sub);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify Razorpay signature and advance order to PAYMENT_CONFIRMED' })
  async verifyPayment(
    @Body() body: VerifyPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.verifyPayment(body, user?.sub);
  }

  @Post('webhook/razorpay')
  @ApiOperation({ summary: 'Idempotent server-to-server webhook endpoint for Razorpay' })
  async handleWebhook(
    @Body() payload: unknown,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.paymentsService.handleRazorpayWebhook(payload, signature || '');
  }

  @Post('manual')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ACCOUNTS, UserRole.ADMIN_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record manual offline counter / bank transfer payment (Accounts only)' })
  async recordManualPayment(
    @Body() body: ManualPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.recordManualPayment(body, user.sub);
  }
}
