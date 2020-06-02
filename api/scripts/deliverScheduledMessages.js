const mongoose = require('mongoose')
const RestHapi = require('rest-hapi')

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
  
  let messages = await RestHapi.list(models.message, {$where: {scheduled: true }}, Log)
  if(messages.docs) {

    for(let i = 0; i < messages.docs.length; i++) {
      let m = messages.docs[i];
      console.log("delivering: ", m);
      let result = await RestHapi.update(models.message, m._id, {
        scheduled: false,
        timestamp: Date.now(),
      }, Log)
      console.log(result);
    };
  }
  process.exit()

} catch (err) {
  Log.error(err)
  process.exit()
}

})();