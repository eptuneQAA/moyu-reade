import React from 'react';
import { render } from 'ink';
import { parseArgs } from './args.js';
import { VERSION } from './version.js';
import App from './ui/App.jsx';

const HELP = `moyu — 终端 / 浏览器小说阅读器

用法：
  moyu                       打开终端书架
  moyu <文件>                直接打开 txt / epub / pdf
  moyu web                   启动本地 Web 阅读器并打开浏览器
  moyu web --no-open         只启动服务，打印地址
  moyu web --port 9000       指定端口
  moyu web moyu://shelf      通过自定义协议打开书架
  moyu web moyu://read/<id>  通过自定义协议打开指定书
  moyu -l, --library         强制打开书架
  moyu --no-resume           从头开始读
  moyu --debug               输出调试日志
  moyu -h, --help            显示帮助
  moyu -v, --version         显示版本

阅读键：
  Space/PgDn 下一页   b/PgUp 上一页   j/k 滚动
  n/p 上下章   g 目录   / 搜索   S 设置   a 自动翻页
  ~ 伪装界面   ? 帮助   q 退出`;

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  if (args.help) {
    console.log(HELP);
    return;
  }

  if (args.version) {
    console.log(`moyu ${VERSION}`);
    return;
  }

  if (args.debug) {
    process.on('uncaughtException', (error) => {
      console.error(error.stack || error.message);
    });
  }

  if (args.command === 'web') {
    const { startWebServer } = await import('./web/server.js');
    const { protocolPath } = await import('./web/protocol.js');
    const initialPath = args.url ? protocolPath(args.url) : '/';
    const server = await startWebServer({
      port: args.port ?? 8787,
      open: args.open,
      reuse: args.port === null,
      initialPath
    });
    if (server.reused) return;

    const stop = async () => {
      await server.close();
      process.exit(0);
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    return;
  }

  render(
    React.createElement(App, {
      initialFile: args.library ? null : args.file,
      noResume: !args.resume
    })
  );
}

main().catch((error) => {
  console.error(`moyu: ${error.message}`);
  process.exitCode = 1;
});
