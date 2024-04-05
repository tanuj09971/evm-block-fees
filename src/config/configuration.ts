export default () => {
  const port = parseInt(process.env.PORT || '3000');

  const WSS_WEB3_URL = process.env.WSS_WEB3_URL;
  // const http_or_https_web3_url = process.env.WEB3_HTTP_RPC || '';

  const block_interval = process.env.BLOCK_INTERVAL || 14;
  const max_cache_size = process.env.MAX_CACHE_SIZE || 30;
  const block_range = [1, 5, 30];

  return {
    port,
    WSS_WEB3_URL,
    // http_or_https_web3_url,
    block_interval,
    max_cache_size,
    block_range
  };
};
