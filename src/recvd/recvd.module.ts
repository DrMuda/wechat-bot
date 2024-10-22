import { Module } from '@nestjs/common';
import { RecvdController } from './recvd.controller';
import { RecvdService } from './recvd.service';

@Module({
  imports: [],
  controllers: [RecvdController],
  providers: [RecvdService],
})
export class AppModule {}
