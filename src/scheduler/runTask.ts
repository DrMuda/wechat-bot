import { PixivUtil } from 'src/pixiv';
import { DailyScheduler } from 'src/scheduler';
import {
  defaultCatchFetch,
  getConfig,
  sendMsgToWx,
  sendPicToWx,
  waitTime,
} from 'src/utils';

const sendYesterdayTop1 = async () => {
  const { success, picPathList, error } = await PixivUtil.getYesterdayTop1();
  console.log('开始发送昨日top1');
  if (success && picPathList?.[0]) {
    await sendMsgToWx({
      isRoom: true,
      to: '守法八代目',
      content: '昨日排行榜top1图集',
    }).catch(defaultCatchFetch);
    await sendPicToWx({
      isRoom: true,
      to: '守法八代目',
      picPath: picPathList[0],
    }).catch(defaultCatchFetch);
    return;
  }
  console.log(error);
};

const saveDailyTop1 = async () => {
  const maxTry = 10;
  console.log('开始保存今日top1');
  for (let i = 0; i < maxTry; i++) {
    const { success } = await PixivUtil.saveDailyTop1();
    if (success) break;
    console.log(`重试第${i + 1}次`);
    await waitTime(1000);
  }
  console.log('保存今日top1结束');
};

export const runTask = () => {
  const { taskTime } = getConfig();
  const taskList: { name: string; task: () => void; time?: string }[] = [
    {
      name: 'sendYesterdayTop1',
      task: sendYesterdayTop1,
      time: taskTime?.sendYesterdayTop1,
    },
    {
      name: 'saveDailyTop1',
      task: saveDailyTop1,
      time: taskTime?.saveDailyTop1,
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
