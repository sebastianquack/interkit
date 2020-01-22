self.addEventListener('install', (event) => {
  console.log("install", JSON.stringify(event)); 
});

self.addEventListener('fetch', (event) => {
  //console.log("fetch", event.request.url);
});