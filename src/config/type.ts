export interface SaveData {
  money: number;
  prevSignInTime: string;
}

export interface SaveDataMap {
  [user: string]: SaveData | undefined;
}
