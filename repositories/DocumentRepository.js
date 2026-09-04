const BaseRepository = require('./BaseRepository');

class DocumentRepository extends BaseRepository {
  constructor() {
    super('documents');
  }

  findByUserId(userId) {
    return this.findAll({ userId });
  }

  findByFileId(fileId) {
    return this.findOne({ fileId });
  }
}

module.exports = new DocumentRepository();
