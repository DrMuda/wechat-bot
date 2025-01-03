import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { RecvdService, RecvdRes } from './recvd.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { RecvdRequestBodySource } from 'src/utils/type';
import { dailySignIn } from 'src/utils';

const dayjs = require('dayjs');

@Controller()
export class RecvdController {
  constructor(private readonly appService: RecvdService) {}

  @Post('recvd')
  @UseInterceptors(FileInterceptor('file'))
  async recvd(@Body() body: any): Promise<RecvdRes> {
    const type = body.type;
    let content = (body.content as string).replace(/「.*」/g, '').trim();
    const isMentioned =
      body.isMentioned === '1' && content.includes('@木小博士');
    content = content.replace('@木小博士', '');
    const isMsgFromSelf = body.isMsgFromSelf === '1';
    let source = {} as RecvdRequestBodySource;
    try {
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

    const config = {
      type,
      isMentioned,
      isMsgFromSelf,
      content,
      isRoom,
      fromUser,
      roomUsers,
      roomName,
    };
    console.log(dayjs().format('YYYY/MM/DD HH:mm:ss'), config);

    return this.appService.router(config);
  }
}
