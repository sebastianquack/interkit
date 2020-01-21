self.addEventListener('install', (event) => {
  console.log("install", JSON.stringify(event)); 
});

self.addEventListener('fetch', (event) => {
  /*if (event.request.mode === 'navigate') {
    event.respondWith(
      new Response("<html><body>sorry, you need to be online</body></html>", {
          headers: {'Content-Type': 'text/html; charset=UTF-8'}
      })
    );
  }*/ 
});