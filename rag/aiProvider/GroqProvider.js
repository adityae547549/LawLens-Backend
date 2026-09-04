const Groq = require('groq-sdk');
const BaseProvider = require('./BaseProvider');

class GroqProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.GROQ_API_KEY || 'placeholder_key_for_offline_init';
    this.model = config.model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    this.temperature = config.temperature ?? 0.1;
    this.maxTokens = config.maxTokens ?? 2048;

    this.client = new Groq({ apiKey: this.apiKey });
  }

  async generate(messages, options = {}) {
    const model = options.model || this.model;
    const temperature = options.temperature ?? this.temperature;
    const maxTokens = options.maxTokens ?? this.maxTokens;

    const response = await this.client.chat.completions.create({
      messages,
      model,
      temperature,
      max_tokens: maxTokens,
      stream: false
    });

    return {
      content: response.choices?.[0]?.message?.content || '',
      raw: response
    };
  }

  async *generateStream(messages, options = {}) {
    const model = options.model || this.model;
    const temperature = options.temperature ?? this.temperature;
    const maxTokens = options.maxTokens ?? this.maxTokens;

    const stream = await this.client.chat.completions.create({
      messages,
      model,
      temperature,
      max_tokens: maxTokens,
      stream: true
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        yield { type: 'content', content: delta };
      }
    }
  }
}

module.exports = GroqProvider;
