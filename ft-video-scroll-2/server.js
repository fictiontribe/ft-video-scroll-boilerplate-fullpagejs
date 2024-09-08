import { watch } from 'fs';
import { join } from 'path';

const clients = new Set();

const server = Bun.serve({
  port: 4444,
  fetch(req, server) {
    const url = new URL(req.url);
    
    // Handle WebSocket upgrade
    if (server.upgrade(req)) {
      return; // Do nothing else
    }

    let filePath = url.pathname;
    if (filePath === '/') filePath = '/public/index.html';
    else if (!filePath.startsWith('/public/')) filePath = '/public' + filePath;
    
    const file = Bun.file(filePath.slice(1));
    return new Response(file);
  },
  websocket: {
    open(ws) {
      clients.add(ws);
    },
    close(ws) {
      clients.delete(ws);
    },
    message(ws, message) {
      // Handle incoming messages if needed
    },
  },
});

console.log(`Listening on http://localhost:${server.port}`);

// Watch for file changes
const watchPaths = ['./public', './src'];
watchPaths.forEach(watchPath => {
  watch(watchPath, { recursive: true }, (eventType, filename) => {
    if (filename) {
      console.log(`File ${filename} changed. Reloading...`);
      clients.forEach(client => client.send('reload'));
    }
  });
});

// Serve live reload script
Bun.serve({
  port: 4446,
  fetch(req) {
    return new Response(
      `
      const socket = new WebSocket('ws://localhost:4444');
      socket.onmessage = (event) => {
        if (event.data === 'reload') window.location.reload();
      };
      `,
      { headers: { 'Content-Type': 'application/javascript' } }
    );
  },
});