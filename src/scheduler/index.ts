const dayjs = require('dayjs');

type Task = () => void;

interface SchedulerOptions {
  time: string; // 每天执行的时间，例如 '14:30:00'
  timezone?: string; // 时区（可选）
}

export class DailyScheduler {
  private task: Task;
  private time: string;
  private timezone: string;
  private timer: NodeJS.Timeout | null = null;
  private lastRunTime: string | null = null;

  constructor(task: Task, options: SchedulerOptions) {
    this.task = task;
    this.time = options.time;
    this.timezone = options.timezone || 'local';
  }

  /**
   * 启动定时任务
   */
  start() {
    if (this.timer) {
      console.warn('定时任务已在运行中！');
      return;
    }

    this.scheduleNextExecution();
    console.log(`定时任务已启动，每天在 ${this.time} 执行`);
  }

  /**
   * 停止定时任务
   */
  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      console.log('定时任务已停止');
    }
  }

  /**
   * 计算下次执行时间，并设置定时器
   */
  private scheduleNextExecution() {
    const now = dayjs();
    let nextExecution = dayjs()
      .set('hour', parseInt(this.time.split(':')[0], 10))
      .set('minute', parseInt(this.time.split(':')[1], 10))
      .set('second', parseInt(this.time.split(':')[2] || '0', 10));

    // 如果设置的时间已经过了今天，则安排到明天
    if (nextExecution.isBefore(now)) {
      nextExecution = nextExecution.add(1, 'day');
    }

    const delay = nextExecution.diff(now);

    console.log(
      `下次执行时间：${nextExecution.format('YYYY-MM-DD HH:mm:ss')}, 距现在还有 ${delay / 1000} 秒`,
    );

    this.timer = setTimeout(() => {
      this.executeTask();
      setTimeout(() => {
        this.scheduleNextExecution();
      }, 5000);
    }, delay);
  }

  /**
   * 执行任务
   */
  private executeTask() {
    try {
      this.task();
      this.lastRunTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
      console.log(`任务执行成功，时间：${this.lastRunTime}`);
    } catch (error) {
      console.error('任务执行失败:', error);
    }
  }

  /**
   * 获取最近一次任务执行时间
   */
  getLastRunTime(): string | null {
    return this.lastRunTime;
  }
}
