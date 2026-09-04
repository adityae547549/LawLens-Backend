class BaseProvider {
  constructor(config = {}) {
    this.config = config;
  }

  async generate(messages, options = {}) {
    throw new Error('generate() must be implemented by Provider subclass');
  }

  async *generateStream(messages, options = {}) {
    throw new Error('generateStream() must be implemented by Provider subclass');
  }
}

module.exports = BaseProvider;
