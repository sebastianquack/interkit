const mongoose = require('mongoose')
const RestHapi = require('rest-hapi')

const db = require('../src/dbutil.js');

if(process.env.NODE_ENV != "production") {
  require('dotenv-safe').config()  
}

RestHapi.config.loglevel = 'WARN'
const Log = RestHapi.getLogger('deliverScheduledMessages')

;(async function deliverScheduledMessages() {
  
try {
  
  mongoose.Promise = Promise

  mongoURI = process.env.MONGODB_URI
  console.log(mongoURI)
  mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })

  const models = await RestHapi.generateModels(mongoose)
    
  await db.deliverScheduledMessages(models.message, Log);

  process.exit()

} catch (err) {
  Log.error(err)
  process.exit()
}

})();