export default () => {
  const PORT = parseInt(process.env.PORT || '3000');

  const WSS_WEB3_URL = process.env.WSS_WEB3_URL;
  const HTTPS_WEB3_URL = process.env.HTTPS_WEB3_URL || '';

  const BLOCK_INTERVAL = process.env.BLOCK_INTERVAL || 14;
  const MAX_CACHE_SIZE = process.env.MAX_CACHE_SIZE || 30;
  const BLOCK_LOOKBACK = process.env.BLOCK_LOOKBACK || '';
  const BLOCK_LOOKBACK_ARRAY = BLOCK_LOOKBACK.split(',').map((val: string) =>
    parseInt(val),
  ) || [];

  return {
    PORT,
    WSS_WEB3_URL,
    HTTPS_WEB3_URL,
    BLOCK_INTERVAL,
    MAX_CACHE_SIZE,
    BLOCK_LOOKBACK,
    BLOCK_LOOKBACK_ARRAY,
  };
};
