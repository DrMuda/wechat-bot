import { PixivUtil } from 'src/pixiv';
import { DailyScheduler } from 'src/scheduler';
import {
  defaultCatchFetch,
  getConfig,
  sendMsgToWx,
  sendPicToWxWithRetry,
  waitTime,
} from 'src/utils';

const sendDailyTop1 = async () => {
  const maxTry = 10;
  console.log('开始获取top1');
  let picPathList: string[] = [];
  for (let i = 0; i < maxTry; i++) {
    const res = await PixivUtil.sendDailyTop1();
    if (res.success) {
      picPathList = res.picPathList || [];
      break;
    }
    console.log(`获取top1失败， 重试第${i + 1}次`);
    await waitTime(1000);
  }
  console.log('开始发送top1');
  await sendMsgToWx({
    isRoom: true,
    to: '守法八代目',
    content: '昨日排行榜top1图集',
  }).catch(defaultCatchFetch);
  await sendPicToWxWithRetry({
    isRoom: true,
    to: '守法八代目',
    picPath: picPathList[0],
    maxTry: 10,
  }).catch(defaultCatchFetch);
  console.log('发送top1结束');
};

export const runTask = () => {
  const { taskTime } = getConfig();
  const taskList: { name: string; task: () => void; time?: string }[] = [
    {
      name: 'sendDailyTop1',
      task: sendDailyTop1,
      time: taskTime?.sendDailyTop1,
    },
  ];

  taskList.forEach(({ name, task, time }) => {
    if (time) {
      const scheduler = new DailyScheduler(task, { time, name });
      scheduler.start();
    } else {
      console.log(`定时任务${name}没有配置时间`);
    }
  });
};
