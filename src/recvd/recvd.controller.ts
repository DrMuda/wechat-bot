import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { RecvdService, RecvdRes } from './recvd.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { RecvdRequestBodySource } from 'src/utils/type';
import { dailySignIn } from 'src/utils';

@Controller()
export class RecvdController {
  constructor(private readonly appService: RecvdService) {}

  @Post('recvd')
  @UseInterceptors(FileInterceptor('file'))
  async recvd(@Body() body: any): Promise<RecvdRes> {
    const type = body.type;
    const isMentioned =
      body.isMentioned === '1' &&
      (body.content as string).includes('@木小博士');
    const isMsgFromSelf = body.isMsgFromSelf === '1';
    const content = (body.content as string).replace('@木小博士', '').trim();
    let source = {} as RecvdRequestBodySource;
    try {
      console.log(body.source);
      source = JSON.parse(body.source);
    } catch (error) {
      console.error('source 解析失败', error);
    }
    const isRoom = !!source?.room?.id;
    const roomName = source.room?.payload?.topic;
    const fromUser = source?.from?.payload?.name;
    const roomUsers = (source.room?.payload?.memberList
      ?.map(({ name }) => name)
      .filter((name) => !!name) || []) as string[];

    dailySignIn(roomUsers);

    return this.appService.router({
      type,
      isMentioned,
      isMsgFromSelf,
      content,
      isRoom,
      fromUser,
      roomUsers,
      roomName,
    });
  }
}
