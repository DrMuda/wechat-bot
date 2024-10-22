import { Injectable } from '@nestjs/common';

const dayjs = require('dayjs');
// @ts-ignore
const { Lunar } = require('lunar-javascript');

export interface RecvdRes {
  success: boolean;
  data?: {
    type?: 'text' | 'fileUrl';
    content: string;
    extra?: string;
  };
}

const isLeapYear = (year: number) => {
  return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
};
const msToDay = (ms: number) => {
  return ms / 1000 / 60 / 60 / 24;
};

@Injectable()
export class RecvdService {
  getNextLunarHolidayDiff(month: number, day: number): number {
    const currentYear = dayjs().year();
    const currentMonth = dayjs().month();
    const currentDay = dayjs().day();
    let lunar = Lunar.fromYmd(currentYear, month, day);
    let solar = lunar.getSolar();
    if (
      (solar.getMonth() as number) < currentMonth ||
      (solar.getDay() as number) < currentDay
    ) {
      lunar = Lunar.fromYmd(currentYear + 1, month, day);
      solar = lunar.getSolar();
    }
    const nextDay = dayjs(
      `${solar.getYear()}-${solar.getMonth()}-${solar.getDay()}`,
    );
    return msToDay(nextDay.diff(dayjs()));
  }
  getNextSolarHolidayDiff(month: number, day: number): number {
    const currentYear = dayjs().year();
    const currentMonth = dayjs().month();
    const currentDay = dayjs().day();
    let solar = dayjs(`${currentYear}-${month}-${day}`);
    if (
      (solar.month() as number) < currentMonth ||
      (solar.day() as number) < currentDay
    ) {
      solar = dayjs(`${currentYear + 1}-${month}-${day}`);
    }
    return msToDay(solar.diff(dayjs()));
  }
  getNextTombSweepingDayDiff(): number {
    const currentYear = dayjs().year();
    const currentMonth = dayjs().month();
    const currentDay = dayjs().day();
    let thisYearTombSweepingDay =
      currentYear * 0.2422 + 4.81 - (isLeapYear(currentYear) ? 1 : 0);
    thisYearTombSweepingDay = Math.floor(thisYearTombSweepingDay);
    let nextYearTombSweepingDay =
      (currentYear + 1) * 0.2422 + 4.81 - (isLeapYear(currentYear + 1) ? 1 : 0);
    nextYearTombSweepingDay = Math.floor(nextYearTombSweepingDay);
    if (currentMonth > 4 || currentDay > thisYearTombSweepingDay) {
      return msToDay(
        dayjs(`${currentYear + 1}-4-${nextYearTombSweepingDay}`).diff(dayjs()),
      );
    }
    return msToDay(
      dayjs(`${currentYear}-4-${thisYearTombSweepingDay}`).diff(dayjs()),
    );
  }

  holiday(): RecvdRes {
    const newYearsDay = this.getNextSolarHolidayDiff(1, 1);
    const theSpringFestival = this.getNextLunarHolidayDiff(1, 1);
    const tombSweepingDay = this.getNextTombSweepingDayDiff();
    const laborDay = this.getNextSolarHolidayDiff(5, 1);
    const theDragonBoatFestival = this.getNextLunarHolidayDiff(5, 5);
    const childrenDay = this.getNextSolarHolidayDiff(6, 1);
    const midAutumn = this.getNextLunarHolidayDiff(8, 15);
    const nationalDay = this.getNextSolarHolidayDiff(10, 1);
    const list = [
      `距离元旦还剩${newYearsDay}天`,
      `距离春节还剩${theSpringFestival}天`,
      `距离清明节还剩${tombSweepingDay}天`,
      `距离劳动节还剩${laborDay}天`,
      `距离端午节还剩${theDragonBoatFestival}天`,
      `距离儿童节还剩${childrenDay}天`,
      `距离中秋节还剩${midAutumn}天`,
      `距离国庆节还剩${nationalDay}天`,
    ].join('\n');
    return {
      success: true,
      data: {
        content: [`========== 假期倒计时 ==========`, list].join('\n'),
        extra: list,
      },
    };
  }

  offWork(): RecvdRes {
    const toHalfFive = dayjs(
      dayjs().diff(dayjs().set('hour', 17).set('minutes', 30)),
    ).format('h:m');
    const toSix = dayjs(
      dayjs().diff(dayjs().set('hour', 18).set('minutes', 0)),
    ).format('h:m');
    const list = [
      `距离五点半下班还剩 ${toHalfFive}`,
      `距离六点下班还剩 ${toSix}`,
    ].join('\n');
    return {
      success: true,
      data: {
        content: ['========== 下班倒计时 ==========', list].join('\n'),
        extra: list,
      },
    };
  }

  countdown(): RecvdRes {
    const { extra: offWork } = this.offWork().data || {};
    const { extra: holiday } = this.holiday().data || {};
    return {
      success: true,
      data: {
        content: [`========== 倒计时 ==========`, offWork, holiday].join('\n'),
      },
    };
  }
}
