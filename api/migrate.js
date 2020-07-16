var migrate = require('migrate')
const { MongoStateStore } = require('@nodepit/migrate-state-store-mongodb');

require('dotenv-safe').config()

module.exports = class MyMongoStateStore extends MongoStateStore {
  constructor() {
    super(process.env.MONGODB_URI)
  }
}
