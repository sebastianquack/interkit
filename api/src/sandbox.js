const {VM} = require('vm2');
const db = require('./dbutil.js');

module.exports.run = async function(node, playerId, hook, msg, callback) {
  let sentResponse = false;

  let t = setTimeout(()=>{
    sentResponse = true;
    callback("timeout"); // timeout for awaiting async script effects
  }, 10000);

  let result = {
    outputs: [],
    moveTo: null
  };

  let defaultNarrator = await db.getVar("board", {boardId: node.board}, "narrator");
  let varCacheBoard = {
    narrator: defaultNarrator ? defaultNarrator : "narrator"
  };
  
  const vm = new VM({
    timeout: 1000, // timeout for script exeuction
    sandbox: {
      player: {
        get: async (key) => {return await db.getVar("player", {playerId}, key); },
        set: (key, value) => { db.setVar("player", {playerId}, key, value); },
      },
      board: {
        get: async (key) => {return await db.getVar("board", {boardId: node.board}, key); },
        set: (key, value) => { 
          varCacheBoard[key] = value;
          db.setVar("board", {boardId: node.board}, key, value); 
        },
      },
      api: {
        output: (text, label=varCacheBoard.narrator) => { result.outputs.push({text, label}); },
        option: (text) => { result.outputs.push({text, option: true}); },
        moveTo: (room) => { result.moveTo = room; }
      }
    }
  });

  let runScript = node.script;

  // expand script to execute appropriate hook
  switch(hook) {
    case "onMessage":
      runScript += `; if(typeof onMessage === "function") onMessage({text: "${msg}"});`; 
      break;
    case "onArrive":
      runScript += `; if(typeof onArrive === "function") onArrive();`; 
      break;
  }
  //console.log("runScript", runScript);

  try {
    let output = await vm.run(runScript);
    //console.log("script output: " + output);
    //console.log(result);
    clearTimeout(t);
    if(!sentResponse) {
      callback(result); 
    }
  } catch (err) {
    clearTimeout(t);
    console.error('script execution failed!', err);
    if(!sentResponse) {
      callback({error: err.toString()});  
    }
  }
}

