export const cheatSheet = 
`// called when player enters node
function onArrive() {
  /* do stuff here... */
}

// called when player sends a message
function onMessage() { 
  /* do stuff here... */
}

output("hello"); // sends message with default narrator
output("hello", "paul") // with custom label
output("hello", "system") // styles as system message

option("option 1") // presents an option
image("image.jpg") // sends an image
audio("audio.mp3") // sends an audio file

moveTo("node") // moves player to another node on the same board

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

// variables
player.set("health", 10) // set via setter
player.health // access as object

// variable scopes
player.set("varname", value) // for this player everywhere
here.set("varname", value) // for all players in this node
playerHere.set("varname", value) // for this player in this node
board.set("varname", value) // for all players in all nodes

// special variables
player.name // used as label in multiplayer
board.narrator // used as default label for messages sent to player

`;