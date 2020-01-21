self.addEventListener('install', (event) => {
  console.log("install", JSON.stringify(event));
});

self.addEventListener('fetch', (event) => {
  console.log("fetch", JSON.stringify(event));
  new Response('<p>Hello from your friendly neighbourhood service worker!</p>', {
    headers: { 'Content-Type': 'text/html' }
  });
});