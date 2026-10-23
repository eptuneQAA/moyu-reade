export class ParseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ParseError';
  }
}
