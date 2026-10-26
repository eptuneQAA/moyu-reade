export function parseArgs(argv) {
  const result = {
    command: 'read',
    file: null,
    library: false,
    resume: true,
    debug: false,
    help: false,
    version: false,
    port: null,
    open: true,
    url: null
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '') continue;
    if (arg === 'web' && result.command === 'read' && result.file === null) {
      result.command = 'web';
    } else if (arg === '--web') {
      result.command = 'web';
    } else if (arg === '--no-open') {
      result.open = false;
    } else if (arg === '--port' || arg === '-p') {
      const value = argv[++i];
      const port = Number(value);
      if (!value || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`无效端口：${value || ''}`);
      }
      result.port = port;
    } else if (arg === '-l' || arg === '--library') {
      result.library = true;
    } else if (arg === '--no-resume') {
      result.resume = false;
    } else if (arg === '--debug') {
      result.debug = true;
    } else if (arg === '-h' || arg === '--help') {
      result.help = true;
    } else if (arg === '-v' || arg === '--version') {
      result.version = true;
    } else if (arg.startsWith('moyu://')) {
      if (result.url) throw new Error(`多余的参数：${arg}`);
      result.command = 'web';
      result.url = arg;
    } else if (arg.startsWith('-')) {
      throw new Error(`未知参数：${arg}`);
    } else if (result.file === null) {
      result.file = arg;
    } else {
      throw new Error(`多余的参数：${arg}`);
    }
  }

  if (result.command === 'web' && result.file) {
    throw new Error('web 模式不接受文件参数');
  }

  return result;
}
