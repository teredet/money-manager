export class DataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DataError';
  }
}
