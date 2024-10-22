import { Injectable } from '@nestjs/common';

const dayjs = require('dayjs');
// @ts-ignore
const { Lunar } = require('lunar-javascript');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const duration = require('dayjs/plugin/duration');
dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Shanghai');

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
    let lunar = Lunar.fromYmd(currentYear, month, day);
    let solar = lunar.getSolar();
    let thisYearHoliday = dayjs(
      `${solar.getYear()}-${solar.getMonth()}-${solar.getDay()}`,
    );
    if (thisYearHoliday.unix() < dayjs().unix()) {
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
    let thisYearHoliday = dayjs(`${currentYear}-${month}-${day}`);
    if (thisYearHoliday.unix() > dayjs()) {
      return msToDay(thisYearHoliday().diff(dayjs()));
    }
    return msToDay(dayjs(`${currentYear + 1}-${month}-${day}`).diff());
  }
  getNextTombSweepingDayDiff(): number {
    const currentYear = dayjs().year() as number;
    const thisYearLast2Num = Number(currentYear.toString().slice(2));
    const nextYearLast2Num = Number((currentYear + 1).toString().slice(2));
    let thisYearTombSweepingDay =
      thisYearLast2Num * 0.2422 + 4.81 - thisYearLast2Num / 4;
    thisYearTombSweepingDay = Math.floor(thisYearTombSweepingDay);
    let nextYearTombSweepingDay =
      nextYearLast2Num * 0.2422 + 4.81 - nextYearLast2Num / 4;
    nextYearTombSweepingDay = Math.floor(nextYearTombSweepingDay);
    if (
      dayjs(`${currentYear}-4-${thisYearTombSweepingDay}`).unix() >
      dayjs().unix()
    ) {
      return msToDay(
        dayjs(`${currentYear}-4-${thisYearTombSweepingDay}`).diff(dayjs()),
      );
    }
    return msToDay(
      dayjs(`${currentYear + 1}-4-${nextYearTombSweepingDay}`).diff(dayjs()),
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
      `距离元旦还剩${Math.floor(newYearsDay)}天`,
      `距离春节还剩${Math.floor(theSpringFestival)}天`,
      `距离清明节还剩${Math.floor(tombSweepingDay)}天`,
      `距离劳动节还剩${Math.floor(laborDay)}天`,
      `距离端午节还剩${Math.floor(theDragonBoatFestival)}天`,
      `距离儿童节还剩${Math.floor(childrenDay)}天`,
      `距离中秋节还剩${Math.floor(midAutumn)}天`,
      `距离国庆节还剩${Math.floor(nationalDay)}天`,
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
    const toHalfFive = dayjs
      .duration(dayjs().set('hour', 17).set('minutes', 30).diff(dayjs()))
      .format('H:m');
    const toSix = dayjs
      .duration(dayjs().set('hour', 18).set('minutes', 0).diff(dayjs()))
      .format('H:m');

    console.log(dayjs().set('hour', 17).set('minutes', 30).diff(dayjs()));

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
