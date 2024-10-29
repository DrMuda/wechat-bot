import { RecvdRes } from 'src/utils/type';

const dayjs = require('dayjs');
// @ts-ignore
const { Lunar } = require('lunar-javascript');

const msToDay = (ms: number) => {
  return ms / 1000 / 60 / 60 / 24;
};

export function getNextLunarHolidayDiff(month: number, day: number): number {
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
export function getNextSolarHolidayDiff(month: number, day: number): number {
  const currentYear = dayjs().year();
  let thisYearHoliday = dayjs(`${currentYear}-${month}-${day}`);
  if (thisYearHoliday.unix() > dayjs()) {
    return msToDay(thisYearHoliday().diff(dayjs()));
  }
  return msToDay(dayjs(`${currentYear + 1}-${month}-${day}`).diff());
}
export function getNextTombSweepingDayDiff(): number {
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
    dayjs(`${currentYear}-4-${thisYearTombSweepingDay}`).unix() > dayjs().unix()
  ) {
    return msToDay(
      dayjs(`${currentYear}-4-${thisYearTombSweepingDay}`).diff(dayjs()),
    );
  }
  return msToDay(
    dayjs(`${currentYear + 1}-4-${nextYearTombSweepingDay}`).diff(dayjs()),
  );
}

export function holiday(): RecvdRes {
  const newYearsDay = getNextSolarHolidayDiff(1, 1);
  const theSpringFestival = getNextLunarHolidayDiff(1, 1);
  const tombSweepingDay = getNextTombSweepingDayDiff();
  const laborDay = getNextSolarHolidayDiff(5, 1);
  const theDragonBoatFestival = getNextLunarHolidayDiff(5, 5);
  const midAutumn = getNextLunarHolidayDiff(8, 15);
  const nationalDay = getNextSolarHolidayDiff(10, 1);
  const holidayList = [
    { name: '元旦', diffDay: newYearsDay },
    { name: '春节', diffDay: theSpringFestival },
    { name: '清明节', diffDay: tombSweepingDay },
    { name: '劳动节', diffDay: laborDay },
    { name: '端午节', diffDay: theDragonBoatFestival },
    { name: '中秋节', diffDay: midAutumn },
    { name: '国庆节', diffDay: nationalDay },
  ];
  const list = holidayList
    .sort((a, b) => a.diffDay - b.diffDay)
    .map(({ diffDay, name }) => `距离${name}还剩${Math.floor(diffDay)}天`)
    .join('\n');
  return {
    success: true,
    data: {
      content: [`==== 假期倒计时 ====`, list].join('\n'),
      extra: list,
    },
  };
}

export function offWork(): RecvdRes {
  if (dayjs().day() === 0) {
    return {
      success: true,
      data: {
        content: [
          '==== 下班倒计时 ====',
          '不会还有人要上班吧， 不会吧不会吧',
        ].join('\n'),
        extra: '',
      },
    };
  }
  const toHalfFive = dayjs().set('hour', 17).set('minutes', 30).diff(dayjs());

  const toSix = dayjs().set('hour', 18).set('minutes', 0).diff(dayjs());
  dayjs.duration().format('HH:mm');

  const list = [
    `距离五点半下班还剩 ${toHalfFive > 0 ? '' : '-'}${dayjs
      .duration(Math.abs(toHalfFive))
      .format('HH:mm')}`,
    `距离六点下班还剩 ${toSix > 0 ? '' : '-'}${dayjs
      .duration(Math.abs(toSix))
      .format('HH:mm')}`,
  ].join('\n');
  return {
    success: true,
    data: {
      content: ['==== 下班倒计时 ====', list].join('\n'),
      extra: list,
    },
  };
}

export function countdown(): RecvdRes {
  const { extra: offWorkData } = offWork().data || {};
  const { extra: holidayData } = holiday().data || {};
  return {
    success: true,
    data: {
      content: [`===== 倒计时 =====`, offWorkData, holidayData].join('\n'),
    },
  };
}
