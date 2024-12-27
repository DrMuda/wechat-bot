import { NestFactory } from '@nestjs/core';
import { AppModule } from './recvd/recvd.module';
import { DailyScheduler } from 'src/scheduler';
import { PixivUtil } from 'src/pixiv';
import {
  defaultCatchFetch,
  sendMsgToWx,
  sendPicToWx,
  waitTime,
} from 'src/utils';

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const duration = require('dayjs/plugin/duration');
dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Shanghai');
console.log('时区', dayjs.tz.guess());

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  console.log(process.env.NODE_ENV);
  await app.listen(process.env.PORT ?? 3000);

  const dailySendPixivTop1 = new DailyScheduler(
    async () => {
      const maxTry = 10;
      for (let i = 0; i < maxTry; i++) {
        const { success, picPathList, error } = await PixivUtil.getDailyTop1();
        if (success && picPathList?.[0]) {
          await sendMsgToWx({
            isRoom: true,
            to: '守法八代目',
            content: '每日排行榜top1图集',
          }).catch(defaultCatchFetch);
          const res = await sendPicToWx({
            isRoom: true,
            to: '守法八代目',
            picPath: picPathList[0],
          }).catch(defaultCatchFetch);
          if (res?.data?.success === true) {
            break;
          }
        } else {
          console.log(error);
        }
        await waitTime(1000);
        console.log(`重试${i + 1}次`);
      }
    },
    { time: '9:30:00' },
  );
  dailySendPixivTop1.start();
}
bootstrap();
