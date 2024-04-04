export default () => {
  const port = parseInt(process.env.PORT || '3000');

  const ws_or_wss_web3_url = process.env.WEB3_WS_RPC || '';
  const http_or_https_web3_url = process.env.WEB3_HTTP_RPC || '';

  const block_interval = process.env.BLOCK_INTERVAL || '14';

  return {
    port,
    ws_or_wss_web3_url,
    http_or_https_web3_url,
    block_interval,
  };
};
