const GroqProvider = require('./GroqProvider');

class ProviderFactory {
  static createProvider(type = process.env.AI_PROVIDER || 'groq', config = {}) {
    switch (type.toLowerCase()) {
      case 'groq':
        return new GroqProvider(config);
      default:
        return new GroqProvider(config);
    }
  }
}

module.exports = ProviderFactory;
