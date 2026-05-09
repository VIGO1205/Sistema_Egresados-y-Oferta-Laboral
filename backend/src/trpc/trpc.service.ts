import { Injectable } from '@nestjs/common';
import { initTRPC } from '@trpc/server';

@Injectable()
export class TrpcService {
  readonly t = initTRPC.create();
  readonly publicProcedure = this.t.procedure;
  readonly router = this.t.router;
  readonly mergeRouters = this.t.mergeRouters;
}
