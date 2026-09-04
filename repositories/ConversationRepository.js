const BaseRepository = require('./BaseRepository');

class ConversationRepository extends BaseRepository {
  constructor() {
    super('conversations');
  }

  findByUserId(userId) {
    return this.findAll({ userId });
  }
}

module.exports = new ConversationRepository();
