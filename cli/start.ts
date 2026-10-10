import { spawn, spawnSync } from 'node:child_process';
import { emitKeypressEvents } from 'node:readline';
import mysql from 'mysql2/promise';

const paint = (code: number) => (text: string) => `\x1b[${code}m${text}\x1b[0m`;
const green = paint(32);
const red = paint(31);
const yellow = paint(33);
const orange = paint(91);
const cyan = paint(36);
const dim = paint(2);
const bold = paint(1);

const REPORT_PORT = 9323;

type ListedSpec = {
  title: string;
  line: number;
};

type ListedSuite = {
  file?: string;
  specs?: ListedSpec[];
  suites?: ListedSuite[];
};

type TestFile = {
  path: string;
  folder: string;
  name: string;
  tests: ListedSpec[];
};

type Choice = {
  label: string;
  run: () => Promise<void> | void;
};

function banner(): void {
  console.log('');
  console.log(green('   ┏━╸╻ ╻┏━┓╻ ╻┏━┓╻┏━┓┏━┓'));
  console.log(green('   ┃  ┃ ┃┣┳┛┃ ┃┣━┛┃┣┳┛┣━┫'));
  console.log(orange('   ┗━╸┗━┛╹┗╸┗━┛╹  ╹╹┗╸╹ ╹') + dim('  Emcash end-to-end tests'));
  console.log('');
}

async function apiIsUp(url: string): Promise<boolean> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(3000) });
    return true;
  } catch {
    return false;
  }
}

async function dbIsUp(uri: string): Promise<boolean> {
  try {
    const db = await mysql.createConnection({ uri, connectTimeout: 3000 });
    await db.end();
    return true;
  } catch {
    return false;
  }
}

async function checkServices(): Promise<void> {
  const api = process.env.WALLET_API_URL;
  const db = process.env.WALLET_DB_URL;
  const [apiUp, dbUp] = await Promise.all([api ? apiIsUp(api) : false, db ? dbIsUp(db) : false]);
  const line = (up: boolean, name: string, where: string) =>
    console.log(`   ${up ? green('✔') : red('✘')} ${name.padEnd(12)} ${dim(where)}`);

  line(apiUp, 'wallet API', api ?? 'WALLET_API_URL is not set in .env');
  line(dbUp, 'wallet DB', db ? new URL(db).host : 'WALLET_DB_URL is not set in .env');

  if (!apiUp || !dbUp) {
    console.log(`\n   ${yellow('!')} Tests that need the wallet will fail. To start it locally: ${cyan('docs/wallet.md#running-it-locally')}`);
  }

  console.log('');
}

function specsOf(suite: ListedSuite): ListedSpec[] {
  return [...(suite.specs ?? []), ...(suite.suites ?? []).flatMap(specsOf)];
}

function listTests(): TestFile[] {
  const listed = spawnSync('npx', ['playwright', 'test', '--list', '--reporter=json'], { encoding: 'utf8' });

  try {
    const report = JSON.parse(listed.stdout) as { suites: ListedSuite[] };

    return report.suites.map((suite) => {
      const path = suite.file ?? '?';
      const slash = path.lastIndexOf('/');

      return {
        path,
        folder: path.slice(0, Math.max(slash, 0)),
        name: path.slice(slash + 1),
        tests: specsOf(suite),
      };
    });
  } catch {
    console.log(red('   Could not list the tests:\n'));
    console.log(listed.stdout || listed.stderr);
    return [];
  }
}

function select(labels: string[]): Promise<number> {
  return new Promise((resolve) => {
    let index = 0;

    const render = (first: boolean) => {
      if (!first) process.stdout.write(`\x1b[${labels.length}A`);

      for (const [i, label] of labels.entries()) {
        process.stdout.write(`\x1b[2K   ${i === index ? cyan(`❯ ${bold(label)}`) : `  ${label}`}\n`);
      }
    };

    const onKey = (_text: string, key: { name?: string; ctrl?: boolean }) => {
      if (key.name === 'up' || key.name === 'k') index = (index - 1 + labels.length) % labels.length;
      if (key.name === 'down' || key.name === 'j') index = (index + 1) % labels.length;

      if (key.name === 'return' || key.name === 'q' || (key.ctrl && key.name === 'c')) {
        process.stdin.off('keypress', onKey);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write('\x1b[?25h');
        resolve(key.name === 'return' ? index : -1);
        return;
      }

      render(false);
    };

    process.stdout.write('\x1b[?25l');
    render(true);
    emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('keypress', onKey);
  });
}

function runTests(files: string[]): number {
  const result = spawnSync('npx', ['playwright', 'test', ...files, '--reporter=./cli/reporter.ts,html'], {
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, PLAYWRIGHT_HTML_OPEN: 'never' },
  });

  return result.status ?? 1;
}

function check(): void {
  for (const script of ['typecheck', 'lint']) {
    const result = spawnSync('npm', ['run', '--silent', script], { stdio: 'inherit' });

    console.log(`   ${result.status === 0 ? green('✔') : red('✘')} ${script}`);
  }
}

function report(): Promise<void> {
  return new Promise((resolve) => {
    const server = spawn('npx', ['playwright', 'show-report', '--host=0.0.0.0', `--port=${REPORT_PORT}`], {
      stdio: 'ignore',
    });

    console.log(`   Report at ${cyan(`http://localhost:${REPORT_PORT}`)} ${dim('(press Enter to go back)')}`);
    process.stdin.resume();
    process.stdin.once('data', () => {
      process.stdin.pause();
      server.kill();
      resolve();
    });
  });
}

const count = (n: number) => dim(`(${n})`);

const totalTests = (files: TestFile[]) => files.reduce((sum, file) => sum + file.tests.length, 0);

async function loop(title: string, choices: Choice[], exit: string): Promise<void> {
  const all = [...choices, { label: dim(exit), run: () => undefined }];

  for (;;) {
    console.log(`   ${bold(title)} ${dim(`↑↓ to move, Enter to pick, q to ${exit === 'Quit' ? 'quit' : 'go back'}`)}\n`);

    const picked = await select(all.map((choice) => choice.label));

    if (picked === -1 || picked === all.length - 1) return;

    console.log('');
    await all[picked].run();
    console.log('');
  }
}

function fileMenu(file: TestFile): Promise<void> {
  return loop(
    `tests/${file.path}`,
    [
      { label: `All in ${file.name} ${count(file.tests.length)}`, run: () => void runTests([`tests/${file.path}`]) },
      ...file.tests.map((test) => ({
        label: test.title,
        run: () => void runTests([`tests/${file.path}:${test.line}`]),
      })),
    ],
    '← Back',
  );
}

function folderMenu(folder: string, files: TestFile[]): Promise<void> {
  return loop(
    `tests/${folder}/`,
    [
      { label: `All in ${folder}/ ${count(totalTests(files))}`, run: () => void runTests([`tests/${folder}/`]) },
      ...files.map((file) => ({
        label: `${file.name} ${count(file.tests.length)}`,
        run: () => fileMenu(file),
      })),
    ],
    '← Back',
  );
}

async function menu(): Promise<void> {
  const files = listTests();
  const folders = [...new Set(files.map((file) => file.folder))];

  await loop(
    'What do you want to run?',
    [
      { label: `All tests ${count(totalTests(files))}`, run: () => void runTests([]) },
      ...folders.flatMap((folder) => {
        const inFolder = files.filter((file) => file.folder === folder);

        if (!folder) {
          return inFolder.map((file) => ({ label: `${file.name} ${count(file.tests.length)}`, run: () => fileMenu(file) }));
        }

        return [{ label: `${folder}/ ${count(totalTests(inFolder))}`, run: () => folderMenu(folder, inFolder) }];
      }),
      { label: `Check ${dim('(typecheck + lint)')}`, run: check },
      { label: 'Open the last report', run: report },
    ],
    'Quit',
  );
}

banner();
await checkServices();

if (process.stdin.isTTY) {
  await menu();
} else {
  process.exitCode = runTests([]);
}
