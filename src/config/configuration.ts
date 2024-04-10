export default () => {
  const port = parseInt(process.env.PORT || '3000');

  const WSS_WEB3_URL = process.env.WSS_WEB3_URL;
  const HTTPS_WEB3_URL = process.env.HTTPS_WEB3_URL || '';

  const block_interval = process.env.BLOCK_INTERVAL || 14;
  const MAX_CACHE_SIZE = process.env.MAX_CACHE_SIZE || 30;
  const block_range = [1, 5, 30];

  return {
    port,
    WSS_WEB3_URL,
    HTTPS_WEB3_URL,
    block_interval,
    MAX_CACHE_SIZE,
    block_range,
  };
};
