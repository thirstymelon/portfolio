import { defineConfig, type Plugin } from 'vite';

function projectRouterPlugin(): Plugin {
  return {
    name: 'project-page-router',
    configureServer(server) {
      server.middlewares.use((req: any, _res: any, next: () => void) => {
        if (!req.url) return next();
        const urlPath = req.url.split('?')[0].toLowerCase();

        if (urlPath === '/glyph' || urlPath === '/projects/glyph') {
          req.url = '/Glyph.dc.html';
        } else if (
          urlPath === '/meshos' ||
          urlPath === '/projects/meshos' ||
          urlPath === '/projects/esp32-mesh'
        ) {
          req.url = '/MeshOS.dc.html';
        } else if (
          urlPath === '/radiokit' ||
          urlPath === '/radio_kit' ||
          urlPath === '/projects/radiokit' ||
          urlPath === '/projects/radio-kit'
        ) {
          req.url = '/Radio_Kit.dc.html';
        } else if (urlPath === '/home' || urlPath === '/main') {
          req.url = '/Main.dc.html';
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [projectRouterPlugin()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
