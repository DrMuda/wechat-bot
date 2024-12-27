import Pixiv, { PixivIllust } from 'pixiv.ts';
import { isDev, saveDataDir } from 'src/config';
import {
  defaultCatchFetch,
  getConfig,
  random,
  sendMsgToWx,
  sendPicToWx,
  waitTime,
} from 'src/utils';
import * as fs from 'fs';

const dayjs = require('dayjs');

export const pixivIllustSavePath = `${saveDataDir}/illust`;

export const searchPic = async ({
  content,
  isRoom,
  fromUser,
  roomName,
}: {
  content: string;
  isRoom: boolean;
  roomName?: string;
  fromUser?: string;
}) => {
  const { success, error, picPathList, tags } =
    await PixivUtil.searchAndDownloadPic({
      text: content,
    });
  if (!success) {
    console.error(error);
    sendMsgToWx({
      content: error || '失败了',
      isRoom,
      to: (isRoom ? roomName : fromUser) || '',
    });
    return;
  }
  const sendParams = { isRoom, to: (isRoom ? roomName : fromUser) || '' };
  if (tags) {
    console.log(['包含的tag', tags.join(', ')].join('\n'));
    sendMsgToWx({
      ...sendParams,
      content: ['包含的tag', tags.join(', ')].join('\n'),
    });
  }
  for (const picPath of picPathList!) {
    console.log(`发送图片， ${picPath}, ${isRoom ? roomName : fromUser}`);
    const res = await sendPicToWx({
      ...sendParams,
      picPath,
    });
    if (res?.data?.success !== true) {
      try {
        console.log('发送图报错了==================');
        console.log(res?.data.message);
        console.log(JSON.stringify(res));
      } catch (error) {
        console.log(res);
      }
    }
  }
};

export class PixivUtil {
  private static pixiv?: Pixiv;
  private constructor() {}

  private static async init() {
    const { refreshToken } = getConfig() || {};
    if (!refreshToken) {
      console.error('缺少 refreshToken');
      return;
    }
    console.log('登录pixiv', refreshToken);
    const pixiv = await Pixiv.refreshLogin(refreshToken).catch((error) => {
      console.log(error);
      return null;
    });
    if (!pixiv) {
      console.error('登录失败');
      return;
    }
    PixivUtil.pixiv = pixiv;
  }

  public static async searchAndDownloadPic({
    text,
  }: {
    text: string;
  }): Promise<{
    success: boolean;
    error?: string;
    picPathList?: string[];
    tags?: string[];
  }> {
    if (!PixivUtil.pixiv) {
      await PixivUtil.init();
    }
    if (!PixivUtil.pixiv) {
      return { success: false, error: 'pixiv登录失败' };
    }
    const pixiv = PixivUtil.pixiv;

    let [word, countAndLimit = ''] = text.split('.');
    let [count, limit] = countAndLimit.split('/') as (string | number)[];
    console.log(word, count, limit);
    count = Math.max(Number(count) || 1, 1);
    limit = Math.max(Number(limit) || 1, 30);
    console.log(word, count, limit);

    // 获取插画并按照收藏数倒序
    let illusts = await pixiv.search
      .illusts({
        word,
        r18: false,
        end_date: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
        start_date: dayjs().subtract(10, 'year').format('YYYY-MM-DD'),
      })
      .catch(defaultCatchFetch);
    if (!illusts || illusts.length < 0) {
      return { success: false, error: '搜图失败' };
    }
    console.log(pixiv.search.nextURL);
    if (pixiv.search.nextURL) {
      illusts = await pixiv.util.multiCall(
        { next_url: pixiv.search.nextURL, illusts },
        Math.ceil(limit / 30),
      );
    }
    illusts = pixiv.util.sort(illusts);
    console.log(`查询到作品${illusts.length}个`);

    // 从列表中的前三分之一的图随机取几张图
    const indexList: number[] = [];
    while (indexList.length < count) {
      const index = Math.floor(random(0, Math.max(illusts.length / 3, count)));
      if (!indexList.includes(index)) {
        indexList.push(index);
      }
    }
    console.log(indexList);

    const illustForDownload: PixivIllust[] = [];
    const timeStamp = isDev ? 'test' : Date.now();
    const path = `${pixivIllustSavePath}/${timeStamp}`;
    const downloadList = indexList.map((index) => {
      const illust = illusts[index];
      if (!illust) return;
      illustForDownload.push(illust);
      if (!fs.existsSync(path)) {
        fs.mkdir(path, () => {});
      }
      return pixiv.util.downloadIllust(illust, path, 'large');
    });

    await Promise.allSettled(downloadList);
    console.log('图片下载完毕');

    let allFileNameList = fs.readdirSync(path);
    // 文件名大概是 125483049_p0.png， 前面是作品id 根据 p 几排序， 让全部图片， p0 在前， p1、p2、p3在后， 这样先取各作品id的第一张， 不够再取其余的
    allFileNameList = allFileNameList.sort((aFileName, bFileName) => {
      const [, aPIndexStr = 'p0'] = aFileName.split('.')[0].split('_');
      const [, bPIndexStr = 'p0'] = bFileName.split('.')[0].split('_');
      const aPIndex = Number(aPIndexStr.replace('p', ''));
      const bPIndex = Number(bPIndexStr.replace('p', ''));
      return aPIndex - bPIndex;
    });

    let picPathList = allFileNameList
      .slice(0, count)
      .map((fileName) => `${path}/${fileName}`);

    const tagsSet = new Set<string>();
    illustForDownload.forEach(({ tags }) => {
      tags.forEach(({ name, translated_name }) => {
        tagsSet.add(`${name}[${translated_name}]`);
      });
    });

    return {
      success: true,
      picPathList,
      tags: Array.from(tagsSet),
    };
  }

  public static async getDailyTop1(): Promise<{
    success: boolean;
    error?: string;
    picPathList?: string[];
    tags?: string[];
  }> {
    if (!PixivUtil.pixiv) {
      await PixivUtil.init();
    }
    if (!PixivUtil.pixiv) {
      return { success: false, error: 'pixiv登录失败' };
    }
    const pixiv = PixivUtil.pixiv;
    console.log('搜图中');
    const illusts = await pixiv.illust
      .ranking({
        mode: 'day_male',
        r18: false,
        type: 'illust',
      })
      .catch(() => null);
    console.log('搜图结束');

    const timeStamp = Date.now();
    const path = `${pixivIllustSavePath}/${timeStamp}`;
    if (!illusts || !illusts[0]) {
      return { success: false, error: '查找排行榜失败' };
    }
    console.log(illusts[0].url);
    try {
      if (!fs.existsSync(path)) {
        fs.mkdir(path, () => {});
      }
      await pixiv.util.downloadIllust(illusts[0], path, 'large');
    } catch (error) {
      console.error('图片下载失败');
    }
    console.log('下载每日排行top1完成');

    let allFileNameList = fs.readdirSync(path);
    let picPathList = allFileNameList.map((fileName) => `${path}/${fileName}`);
    return { success: true, picPathList: picPathList };
  }
}
