export const cheatSheet = 
`
// called when player enters node for the first time or is explicitly moved there
function onArrive() {
  /* do stuff here... */
}

// called when server receives input from a player
function onReceive(input) { 
  /* do stuff here... */

  input.type // "text" or "option" or "image" or "audio" or "qr" or "GPS"
  input.text // the text lowercase and trimmed
  input.raw  // the raw input without processing
  input.key  // the option key if player tapped option
  input.index // the index of option sent via send.options
  input.filename // the image or audio file
  input.coords   // the GPS coordinates {lat: 10, lng: 10}
  input.attachment.QRCode   // the decoded QR code
}

send.text("hello") // sends message with default narrator 
send.text("hello", {label: "paul"}) // with custom label
send.text("hello", {delay: {hours:1, minutes:30, seconds: 25}}) // send in the future, works also for images etc.

send.system("hello") // styles message as system message

send.option("option 1") // presents an option
send.option("option with long text", {key: "1"}) // adds a short reference key

send.options(["yes", "no"], {key: "optionGroup1"}) // presents a set of options

send.image("image.jpg") // sends an image
send.audio("audio.mp3") // sends an audio file

send.audio("audio.mp3", {autoplay: true}) // on android & web, autoplay sound when message appears 
send.audio("audio.mp3", {stopAfterEnded: true}) // stop after ended (default is to coninute to next audio in chat)

send.qr("bla") // display qr code on client

send.text("hello", {to: "sender"}) // specify that only the sender (or the player that just arrived) should receive the message
send.text("hello", {to: "all"}) // specify that all players in this node should get it
send.text("hello", {to: "others"}) // specify that only the other players should get it
send.text("hello", {to: "custom", players: ["id1", "id2"]}) // send to custom list of players identified by id

board.subscribe("channelName") // subscribe player to receive messages send to board channel
board.unsubscribe("channelName") // unsubscribe
send.text("hello", {to: "boardAll"}) // send message to all players on baord subscribed to channel (including self)
send.text("hello", {to: "boardOthers"}) // send only to others subscribed to channel

echo(input, {to: "others"}) // send a received input to the other players in this node (useful for multiplayer)
echo(input) // short form, {to: "others"} is default 

moveTo("nodeName") // moves this player to another node on the same board
moveTo("nodeName", {delay: {minutes: 1, seconds: 30}}) // move player to another node afer 1:30 delay
moveTo("nodeName", {delay: 30}) // short version - 30 seconds

moveTo("nodeName", {for: "all"}) // moves all players in this node to another node (currently not possible with delay)
moveTo("nodeName", {execOnArrive: false}) // moves to a node but skips onArrive (currently not possible with delay)

forward(input, "nodeName") // calls onReceive on a different node on this board to handle the input without doing a moveTo

// variables
player.set("health", 10) // set via setter
player.health // access as object

// player variables on other players
await vars.get("player", {player: id}, "health")
await vars.set("player", {player: id}, "health", 10)

// variable scopes
player.set("varname", value) // for this player everywhere
here.set("varname", value) // for all players in this node
playerHere.set("varname", value) // for this player in this node
board.set("varname", value) // for all players in all nodes

// special variables
player.name // used as label in multiplayer
board.narrator // used as default label for messages sent to player




// items

createOrUpdateItem({
      key: "Zielgebiet",
      type: "location", // location is shown on map, document in archive
      value: {
        lat: 52.493606, 
        lng: 13.438209,
        revealOnProximity: 100, // option to show marker only when user is close and hide when far away
        description: "Hier wurde eine hohe Wahrscheinlichkeit für Lebensform B78-C# gemessen.",
        sound: "twitscher.mp3",
        buttons: [{label: "tap me", node: "boardName/nodeName"}]
      }
    });
awardItem("Zielgebiet"); // award item to player
awardItem("Zielgebiet", {to: "all"}); // award item to all players in project
removeItem("Zielgebiet"); // revoke item from player

async function onArrive() { // async function needed for loading items form database
  let item = await getItem("Zielgebiet") // get the current value of an item 
}

distance(input.coords, item.value) // calculate distance between user's posiiton and item or other position


// we have a special from object in onArrive that can be useful with buttons

function onArrive(from) {  
  from.prevNode // the name of the previous node on this board
  from.item // the item that had the button if one was pressed
  from.button // the label of the button that if one was pressed
}

boards.list("boardName") // reveal unlisted board to player
boards.unlist("boardName") // hide listed board


interface("map", {arrowMode: true, arrowTarget: item}) // set map arrow to point to an item
interface("map", {arrowMode: true, arrowDirection: 45}) // set map arrow to point to a specific direction
interface("map", {arrowMode: false}) // turn off arrow

interface("request-geoposition") // client responds with coordinates (use with caution)

// turn on or off input elements in the interface - this is persisted per board
interface("inputs", {
    text: true,
    attachments: true,
    gps: true,
    image: true,
    audio: true,
    qr: true,
    hideOwnInput: false // set this to true if player's own input should not be displayed
  }
)       


// deprecated

output("hello"); // sends message with default narrator
output("hello", "paul") // with custom label
output("hello", "system") // styles as system message

scheduleOutput({hours:1, minutes:30}, "hi again", "paul"}) // schedule a message to be delivered to the player in the future      

option("option 1") // presents an option
image("image.jpg") // sends an image
audio("audio.mp3") // sends an audio file

// input object
input.raw // the raw input text
input.message // sanitized input text (trimmed and lowercase)

// image
input.attachment.mediatype // "image" 
input.attachment.filename // the image filename 

// GPS
input.attachment.mediatype // "GPS" 
input.attachment.lat, input.attachment.lng // coordinates

// QR
input.attachment.QRCode // the decoded qr code



// disabled

moveTo("node") // moves player to another node on the same board
moveTo("node", 100) // move player to another node afer 100ms delay
moveTo("node", 0, true) // moves all players in this node to another node (with 0 delay)

`;