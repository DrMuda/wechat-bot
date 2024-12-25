import Pixiv from 'pixiv.ts';
import { isDev, saveDataDir } from 'src/config';
import {
  defaultCatchFetch,
  getConfig,
  random,
  sendMsgToWx,
  sendPicToWx,
} from 'src/utils';
import * as fs from 'fs';

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
  const { success, error, picPathList } = await PixivUtil.searchAndDownloadPic({
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
  for (const picPath of picPathList!) {
    console.log(`发送图片， ${picPath}, ${isRoom ? roomName : fromUser}`);
    const res = await sendPicToWx({
      isRoom,
      to: (isRoom ? roomName : fromUser) || '',
      picPath,
    });
    if (res?.data?.success !== true) {
      console.log(res!.data.message);
      console.log(JSON.stringify(res!.data.task));
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
  }): Promise<{ success: boolean; error?: string; picPathList?: string[] }> {
    if (!PixivUtil.pixiv) {
      await PixivUtil.init();
    }
    if (!PixivUtil.pixiv) {
      return { success: false, error: 'pixiv登录失败' };
    }

    let [word, count] = text.split('.') as [string, string | number];
    count = Math.max(Number(count) || 1, 1);

    // 获取插画并按照收藏数倒序
    let illusts = await PixivUtil.pixiv.search
      .illusts({
        word,
        r18: false,
      })
      .catch(defaultCatchFetch);
    if (!illusts) return { success: false, error: '搜图失败' };
    illusts = PixivUtil.pixiv.util.sort(illusts);
    console.log(`查询到作品${illusts.length}个`);

    // 从列表中的前三分之一的图随机取几张图
    const indexList: number[] = [];
    while (indexList.length < count) {
      const index = Math.floor(random(0, Math.max(illusts.length / 3, count)));
      if (!indexList.includes(index)) {
        indexList.push(index);
      }
    }

    const timeStamp = isDev ? 'test' : Date.now();
    const path = `${pixivIllustSavePath}/${timeStamp}`;
    const downLoadList = indexList.map((index) => {
      const illust = illusts[index];
      if (!fs.existsSync(path)) {
        fs.mkdir(path, () => {});
      }
      return PixivUtil.pixiv?.util.downloadIllust(illust, path, 'medium');
    });
    await Promise.allSettled(downLoadList);
    console.log('图片下载完毕');

    let allFileNameList = fs.readdirSync(path);
    // 文件名大概是 125483049_p0.png， 前面是作品id 根据 p 几排序， 让全部图片， p0 在前， p1、p2、p3在后， 这样先取各作品id的第一张， 不够再取其余的
    allFileNameList = allFileNameList.sort((aFileName, bFileName) => {
      const [, aPIndexStr] = aFileName.split('.')[0].split('_');
      const [, bPIndexStr] = bFileName.split('.')[0].split('_');
      const aPIndex = Number(aPIndexStr.replace('p', ''));
      const bPIndex = Number(bPIndexStr.replace('p', ''));
      return aPIndex - bPIndex;
    });

    return {
      success: true,
      picPathList: allFileNameList
        .slice(0, count)
        .map((fileName) => `file://${path}/${fileName}`),
    };
  }
}
