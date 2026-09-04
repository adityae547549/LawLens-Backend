const BaseRepository = require('./BaseRepository');

class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  findByEmail(email) {
    return this.findOne({ email });
  }

  findByGoogleId(googleId) {
    return this.findOne({ googleId });
  }
}

module.exports = new UserRepository();
