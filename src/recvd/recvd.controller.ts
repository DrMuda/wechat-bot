import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { RecvdService, RecvdRes } from './recvd.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller()
export class RecvdController {
  constructor(private readonly appService: RecvdService) {}

  @Post('recvd')
  @UseInterceptors(FileInterceptor('file'))
  async recvd(@Body() body: any): Promise<RecvdRes> {
    const type = body.type;
    const isMentioned = body.isMentioned === '1';
    const content = (body.content as string).replace('@木小博士 ', '').trim();
    const isRoom = !!body.source?.room?.id;
    const fromUser = body.source?.from?.payload?.name;

    console.log(body.isMentioned, body.source)

    return this.appService.router({
      type,
      isMentioned,
      content,
      isRoom,
      fromUser,
    });
  }
}
