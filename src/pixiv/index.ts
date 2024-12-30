import Pixiv, { PixivIllust, PixivParams } from 'pixiv.ts';
import { saveDataDir } from 'src/config';
import {
  defaultCatchFetch,
  getConfig,
  random,
  retryExec,
  sendMsgToWx,
  sendPicToWxWithRetry,
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
  const sendParams = { isRoom, to: (isRoom ? roomName : fromUser) || '' };
  try {
    const { success, error, picPathList, tags } =
      (await PixivUtil.searchAndDownloadPic({
        text: content,
      }).catch(defaultCatchFetch)) || { success: false, error: '报错了' };
    if (!success) {
      console.error(error);
      sendMsgToWx({
        ...sendParams,
        content: error || '失败了',
      });
      return;
    }
    if (tags) {
      console.log(['包含的tag', tags.join(', ')].join('\n'));
      sendMsgToWx({
        ...sendParams,
        content: ['包含的tag', tags.join(', ')].join('\n'),
      });
    }
    for (const picPath of picPathList!) {
      await sendPicToWxWithRetry({
        ...sendParams,
        picPath,
      });
    }
  } catch (error) {
    console.log(error);
    sendMsgToWx({
      ...sendParams,
      content: '报错了',
    });
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
    await retryExec(
      async () => {
        const pixiv =
          await Pixiv.refreshLogin(refreshToken).catch(defaultCatchFetch);
        if (pixiv) {
          PixivUtil.pixiv = pixiv;
          console.log('pixiv登录成功');
          return true;
        }
        return false;
      },
      { label: 'pixiv登录失败', maxTry: 10, waitTimeMs: 500 },
    );
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
    count = Math.max(Number(count) || 1, 1);
    limit = Math.max(Number(limit) || 1, 30);

    const params: PixivParams = {
      word: word.trim(),
      r18: false,
      end_date: dayjs()
        .subtract(Math.round(random(0, 10)), 'month')
        .format('YYYY-MM-DD'),
      start_date: dayjs().subtract(10, 'year').format('YYYY-MM-DD'),
      type: 'illust',
    };
    console.log(JSON.stringify({ ...params, count, limit }));
    // 获取插画并按照收藏数倒序
    let illusts: PixivIllust[] | null = [];

    await retryExec(
      async () => {
        illusts = await pixiv.search.illusts(params).catch(defaultCatchFetch);
        if (pixiv.search.nextURL && illusts) {
          console.log('下一页', pixiv.search.nextURL);
          illusts = await pixiv.util.multiCall(
            { next_url: pixiv.search.nextURL, illusts },
            Math.ceil(limit / 30),
          );
        }
        if (illusts && illusts.length > 0) return true;
        return false;
      },
      {
        label: `搜图【${params.word}】失败`,
        maxTry: 5,
        waitTimeMs: 500,
      },
    );

    if (!illusts) {
      return { success: false, error: '搜图失败' };
    }
    if (illusts.length <= 0) {
      return { success: false, error: '搜到0个图集' };
    }

    illusts = pixiv.util.sort(illusts);
    console.log(`查询到作品${illusts.length}个`);
    // 过滤掉爆乳tag， 柰子比整个身体都大, 太恶心了🤮
    illusts = illusts.filter(({ tags }) => {
      const tag = tags.find(
        ({ translated_name }) => translated_name === 'huge breasts',
      );
      return !tag;
    });
    console.log(`过滤后${illusts.length}个`);
    if (!illusts || illusts.length <= 0) {
      return { success: false, error: '怎么都是爆乳，悲🤮' };
    }

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
    const timeStamp = Date.now();
    const path = `${pixivIllustSavePath}/search/${timeStamp}`;
    const downloadList = indexList.map((index) => {
      const illust = illusts?.[index];
      if (!illust) return;
      illustForDownload.push(illust);
      if (!fs.existsSync(path)) {
        fs.mkdir(path, () => {});
      }
      return pixiv.util.downloadIllust(illust, path, 'large');
    });

    await retryExec(
      async () => {
        try {
          await Promise.allSettled(downloadList).catch(defaultCatchFetch);
          return true;
        } catch (error) {
          console.error(error);
          return false;
        }
      },
      { label: '下载图片报错', maxTry: 5, waitTimeMs: 500 },
    );
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
        if (translated_name) {
          tagsSet.add(`${name}[${translated_name}]`);
        } else {
          tagsSet.add(name);
        }
      });
    });

    return {
      success: true,
      picPathList,
      tags: Array.from(tagsSet),
    };
  }

  public static async sendDailyTop1(): Promise<{
    success: boolean;
    error?: string;
    picPathList?: string[];
  }> {
    if (!PixivUtil.pixiv) {
      await PixivUtil.init();
    }
    if (!PixivUtil.pixiv) {
      return { success: false, error: 'pixiv登录失败' };
    }
    const pixiv = PixivUtil.pixiv;
    console.log('搜图中');
    let illusts: PixivIllust[] | null = [];
    await retryExec(
      async () => {
        illusts = await pixiv.illust
          .ranking({
            r18: false,
            type: 'illust',
          })
          .catch(defaultCatchFetch);
        if (!illusts || !illusts[0]) return false;
        return true;
      },
      { label: '查找排行榜失败', maxTry: 10, waitTimeMs: 1000 },
    );
    console.log('搜图结束');

    const path = `${pixivIllustSavePath}/top1/${dayjs().format('YYYYMMDD')}`;
    if (!illusts || !illusts[0]) {
      return { success: false, error: '查找排行榜失败' };
    }
    console.log(illusts[0].url);
    await retryExec(
      async () => {
        try {
          if (!fs.existsSync(path)) {
            fs.mkdir(path, () => {});
          }
          await pixiv.util.downloadIllust(illusts![0], path, 'large');
          return true;
        } catch (error) {
          console.error(error);
          return false;
        }
      },
      { label: '图片下载失败', maxTry: 10, waitTimeMs: 1000 },
    );

    console.log('下载每日排行top1完成');

    let allFileNameList = fs.readdirSync(path);
    let picPathList = allFileNameList.map((fileName) => `${path}/${fileName}`);
    return { success: true, picPathList: picPathList };
  }
}
