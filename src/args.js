export function parseArgs(argv) {
  const result = {
    file: null,
    library: false,
    resume: true,
    debug: false,
    help: false,
    version: false
  };

  for (const arg of argv) {
    if (arg === '-l' || arg === '--library') result.library = true;
    else if (arg === '--no-resume') result.resume = false;
    else if (arg === '--debug') result.debug = true;
    else if (arg === '-h' || arg === '--help') result.help = true;
    else if (arg === '-v' || arg === '--version') result.version = true;
    else if (arg.startsWith('-')) throw new Error(`未知参数：${arg}`);
    else if (result.file === null) result.file = arg;
    else throw new Error(`多余的参数：${arg}`);
  }

  return result;
}
