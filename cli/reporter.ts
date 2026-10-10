import type { FullResult, Reporter, Suite, TestCase, TestResult, TestStep } from '@playwright/test/reporter';
import { relative } from 'node:path';

const paint = (code: number) => (text: string) => `\x1b[${code}m${text}\x1b[0m`;
const green = paint(32);
const red = paint(31);
const yellow = paint(33);
const cyan = paint(36);
const dim = paint(2);
const bold = paint(1);

const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function userSteps(steps: TestStep[], depth = 0): string[] {
  return steps
    .filter((step) => step.category === 'test.step')
    .flatMap((step) => [
      `${'  '.repeat(depth)}${step.error ? red('✘') : green('✔')} ${step.error ? red(step.title) : step.title} ${dim(seconds(step.duration))}`,
      ...userSteps(step.steps, depth + 1),
    ]);
}

export default class CurupiraReporter implements Reporter {
  private total = 0;
  private finished = 0;
  private counts = { passed: 0, failed: 0, flaky: 0, skipped: 0 };
  private frame = 0;
  private timer: NodeJS.Timeout | undefined;
  private lastFile = '';
  private readonly live = !!process.stdout.isTTY;

  printsToStdio(): boolean {
    return true;
  }

  onBegin(_config: unknown, suite: Suite): void {
    this.total = suite.allTests().length;
    console.log(`\n  ${bold(`Running ${this.total} test${this.total === 1 ? '' : 's'}`)}\n`);

    if (this.live) {
      this.timer = setInterval(() => this.spin(), 80);
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status !== 'passed' && result.status !== 'skipped' && result.retry < test.retries) {
      return;
    }

    this.clearSpinner();
    this.finished++;

    const file = relative('tests', test.location.file);

    if (file !== this.lastFile) {
      console.log(`  ${cyan(bold(file))}`);
      this.lastFile = file;
    }

    const outcome = test.outcome();
    const tags = test.tags.length ? ` ${dim(test.tags.join(' '))}` : '';

    if (outcome === 'skipped') {
      this.counts.skipped++;
      console.log(`  ${yellow('↷')} ${dim(test.title)}${tags}\n`);
      return;
    }

    const passed = outcome === 'expected' || outcome === 'flaky';
    const mark = passed ? green('✔') : red('✘');
    const flaky = outcome === 'flaky' ? ` ${yellow('(flaky)')}` : '';

    this.counts[outcome === 'flaky' ? 'flaky' : passed ? 'passed' : 'failed']++;
    console.log(`  ${mark} ${bold(test.title)}${tags} ${dim(seconds(result.duration))}${flaky}`);

    for (const line of userSteps(result.steps)) {
      console.log(`      ${line}`);
    }

    if (!passed) {
      const message = (result.error?.message ?? 'failed').split('\n').slice(0, 12);
      const context = result.attachments.find((attachment) => attachment.name === 'error-context')?.path;

      console.log('');

      for (const line of message) {
        console.log(`      ${line}`);
      }

      if (context) {
        console.log(`\n      ${dim('details:')} ${relative(process.cwd(), context)}`);
      }
    }

    console.log('');
  }

  onEnd(result: FullResult): void {
    this.clearSpinner();

    if (this.timer) {
      clearInterval(this.timer);
    }

    const { passed, failed, flaky, skipped } = this.counts;
    const parts = [
      green(`${passed} passed`),
      failed ? red(`${failed} failed`) : dim('0 failed'),
      ...(flaky ? [yellow(`${flaky} flaky`)] : []),
      ...(skipped ? [yellow(`${skipped} skipped`)] : []),
      dim(seconds(result.duration)),
    ];
    const text = parts.join(dim(' · '));
    const width = text.replace(/\x1b\[\d+m/g, '').length + 4;
    const border = result.status === 'passed' ? green : red;

    console.log(border(`  ╭${'─'.repeat(width)}╮`));
    console.log(`${border('  │')}  ${text}  ${border('│')}`);
    console.log(border(`  ╰${'─'.repeat(width)}╯`));
  }

  private spin(): void {
    this.frame = (this.frame + 1) % frames.length;
    process.stdout.write(`\r\x1b[2K  ${cyan(frames[this.frame])} ${dim(`${this.finished} of ${this.total} done`)}`);
  }

  private clearSpinner(): void {
    if (this.live) {
      process.stdout.write('\r\x1b[2K');
    }
  }
}
