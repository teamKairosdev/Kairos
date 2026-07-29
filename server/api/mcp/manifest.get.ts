import { getKairosMCPManifest } from '../../services/mcp';

export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'Cache-Control': 'public, max-age=3600',
    'Access-Control-Allow-Origin': '*',
  });
  return getKairosMCPManifest();
});
