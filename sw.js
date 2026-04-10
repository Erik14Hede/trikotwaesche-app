// sw.js

self.addEventListener('fetch', (event) => {
    // Check if the request is from an HTTP(S) source
    if (!event.request.url.startsWith('http')) {
        return;
    }

    event.respondWith(
        caches.open('your-cache-name')
            .then(async (cache) => {
                try {
                    // Check if the response is already cached
                    const cachedResponse = await cache.match(event.request);
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    // If not cached, fetch the response
                    const networkResponse = await fetch(event.request);
  
                    // Validate the response before caching
                    if (networkResponse && networkResponse.ok) {
                        // Put the validated response in the cache
                        await cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                } catch (error) {
                    console.error('Fetching failed:', error);
                    // Handle errors like network issues
                    throw error;
                }
            })
    );
});

self.addEventListener('message', (event) => {
    // Handle messages from other parts of the application
    console.log('Message received from client:', event.data);
});