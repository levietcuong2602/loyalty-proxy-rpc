import { Body, Controller, Get, Post } from '@nestjs/common';
import { RpcService } from './rpc.service';

@Controller('rpc')
export class RpcController {
  constructor(private readonly rpcService: RpcService) {}

  @Post('')
  async forwardRpcRequest(@Body() body: any) {
    return this.rpcService.forwardRpcRequest(body);
  }

  @Get('health')
  async getHealth() {
    return this.rpcService.getHealth();
  }
}
