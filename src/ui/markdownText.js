export function stripMarkdownForTerminal(text) {
  return text
    .replace(/^\s{0,3}#{1,6}\s+/, '')
    .replace(/^\s{0,3}>\s?/, '')
    .replace(/^\s*```.*$/, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[*_`~]/g, '')
    .replace(/^\s*[-*+]\s+/, '· ')
    .replace(/\|/g, ' ')
    .replace(/[ \t]+$/g, '');
}
