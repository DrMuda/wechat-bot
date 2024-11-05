export interface SaveData {
  money: number;
  prevSignInTime: string;
  luck: number, 
  /** 战斗力 */
  battleStrength: number,
  /** 议价能力 */
  bargainingPower: number,
  /** 盗窃能力 */
  thieverySkills: number,
}

export interface SaveDataMap {
  [user: string]: SaveData | undefined;
}
export interface RecvdRes {
  success: boolean;
  data?: {
    type?: 'text' | 'fileUrl';
    content: string;
    extra?: string;
  };
}

export interface RecvdRequestBodySource {
  room?: {
    _events?: {};
    _eventsCount?: number;
    // "@@85627c45cc80fd3d6b98efef3d498e829f7fd6d676d52a561fff7d64f9bf5cf7"
    id?: string;
    payload?: {
      adminIdList?: [];
      // "http://localhost:3001/resouces?media=%2Fcgi-bin%2Fmmwebwx-bin%2Fwebwxgetheadimg%3Fseq%3D0%26username%3D%40%4085627c45cc80fd3d6b98efef3d498e829f7fd6d676d52a561fff7d64f9bf5cf7%26skey%3D%40crypt_fa97763_08234ab1a143612ffb74fde67514d1a6"
      avatar?: string;
      // "@@85627c45cc80fd3d6b98efef3d498e829f7fd6d676d52a561fff7d64f9bf5cf7"
      id?: string;
      // 群名
      topic?: string;
      // 群成员列表
      memberList?: {
        // "http://localhost:3001/resouces?media=%2Fcgi-bin%2Fmmwebwx-bin%2Fwebwxgeticon%3Fseq%3D604100066%26username%3D%400a0fd59064a4f8edc6c824d403e9ff07500358764f27151c6bb231d2ec208993%26skey%3D"
        avatar?: string;
        // "@0a0fd59064a4f8edc6c824d403e9ff07500358764f27151c6bb231d2ec208993"
        id?: string;
        // "木大博士"
        name?: string;
        alias?: string;
      }[];
    };
  };
  to?: {};
  from?: {
    _events?: {};
    _eventsCount?: 0;
    // '@0a0fd59064a4f8edc6c824d403e9ff07500358764f27151c6bb231d2ec208993'
    id?: string;
    payload?: {
      address?: string;
      alias?: string;
      avatar?: string;
      city?: string;
      // 是否是机器人的好友
      friend?: boolean;
      // 性别 1 是男， 0可能是女
      gender?: number;
      id?: string;
      name?: string;
      phone?: [];
      province?: string;
      signature?: string;
      star?: boolean;
      weixin?: string;
      type?: 1;
    };
  };
}
