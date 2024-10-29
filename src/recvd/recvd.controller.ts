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
    const isMsgFromSelf = body.isMsgFromSelf === '1';
    const content = (body.content as string).replace('@木小博士 ', '').trim();
    let source = {} as Record<string, any>;
    try {
      console.log(body.source)
      source = JSON.parse(body.source);
    } catch (error) {
      console.error('source 解析失败', error);
    }
    const isRoom = !!source?.room?.id;
    const fromUser = source?.from?.payload?.name;

    return this.appService.router({
      type,
      isMentioned,
      isMsgFromSelf,
      content,
      isRoom,
      fromUser,
    });
  }
}
