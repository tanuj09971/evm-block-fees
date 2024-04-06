export default () => {
  const port = parseInt(process.env.PORT || '3000');

  const WSS_WEB3_URL = process.env.WSS_WEB3_URL;
  const HTTPS_WEB3_URL = process.env.HTTPS_WEB3_URL || '';

  const block_interval = process.env.BLOCK_INTERVAL || 14;
  const max_cache_size = process.env.MAX_CACHE_SIZE || 30;
  const block_range = [1, 5, 30];

  return {
    port,
    WSS_WEB3_URL,
    HTTPS_WEB3_URL,
    block_interval,
    max_cache_size,
    block_range,
  };
};
