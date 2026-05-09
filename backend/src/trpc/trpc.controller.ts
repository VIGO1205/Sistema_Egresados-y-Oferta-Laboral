import { Controller, Post, Body } from '@nestjs/common';
import { TrpcService } from './trpc.service';

@Controller('trpc')
export class TrpcController {
  constructor(private trpcService: TrpcService) {}

  @Post('/')
  async handleTrpc(@Body() data: any) {
    // tRPC server would normally handle this through middleware
    // This is a placeholder for HTTP-based tRPC routing
    return { data: 'tRPC endpoint' };
  }
}
