# EVM-BLOCK-FEES

EVM Block Fees is a versatile tool for calculating average native ETH transaction fees within customizable block ranges. It currently supports calculations for 1 block, 5 blocks, and 30 blocks, and can be easily extended to accommodate additional ranges.

## Installation

### Docker Installation

Make sure you have Docker installed on your machine. If not, you can download and install Docker from [here](https://docs.docker.com/get-docker/).

### Running with Docker Compose

1. Clone this repository:

   ```bash
   git clone https://github.com/tanuj09971/evm-block-fees.git
   ```

2. Navigate to the project directory:

   ```bash
   cd evm-block-fees
   ```

3. Update enviornment variables.

   To properly configure the application, you need to set up the following environment variables:

   - PORT: This variable specifies the port on which the api will be exposed.
   - HTTPS_WEB3_URL: This variable specifies the https protocoled web3 rpc url.
   - WSS_WEB3_URL: This variable specifies the wss protocoled web3 rpc url.
   - BLOCK_INTERVAL: This variable specifies the block interval in which a block is generated.
   - MAX_CACHE_SIZE: This variable specifies the maximum block range.
   - BLOCK_RANGE: This variable specifies the total range of blocks. Adjust this variable to customize the block range for obtaining different ranges of blocks.

   Please refer to the .env.example file for guidance on setting these variables appropriately.

4. Build and start the Docker containers using Docker Compose:

   ```bash
   docker compose up --build
   ```

## Technologies Used

- NestJs framework of Node.js
- Web3-Proxy by llama nodes [here]('https://github.com/llamanodes/web3-proxy)
- Ethers.js library to interact with Ethereum Blockchain

## Usage

### Optimized Web3 Interactions

- Web3 Proxy to distribute requests across multiple Web3 RPCs, preventing any single RPC from being overwhelmed. This enhances the reliability and scalability Web3 interactions with outside RPCs. The processes consuming this proxy keeps it as a sidecar process. All the RPCs are listed in the `web3-proxy.toml` file

### Real-time Block Data Handling
- Ethers module (`src/ethers`) establishes a WebSocket connection with sidecar Web3 Proxy to listen to new block events, under the hood, it uses ethers.js and have advanced features implemented for downstream modules:- 
1. Block streaming using RxJS so dependent systems can subscribe to blocks
2. Also stream BlocksWithTransactions for further processing
3. Handle missed block events in situation where websocket connection were interrupted
4. Exponential backoff and retries for RPC interactions
5. A generic interface so it can be used for any new module as well

### Efficient Caching and Analytics

- #### Block Cache Service

  - (`src/block-cache`) A dedicated block cache service, subscribes to the RxJS new block data.
  - Store block with transaction data in LRU cache 
  - Handle cache backfill on startup time to fill historical block data needed to serve stats of more than one block
  - Publishes an RxJS even whenever the cache is updated with new block data (starts only after initial backfill), this allows downstream modules to perform any processing needed when new blocks are available
  - Provides helper functions to know if cache is fresh or not.

- #### Block Analytics Cache Service

  - (`src/block-analytics-cache`) A dedicated block analytics cache service, which subscribes to cache updates from the block cache service
  - Retreives the block data with transactions data and call (`src/block-stats`) service, which analyses the block transations and computes statistics
  - After computation of stats, for specific lookback number of blocks, it maintains a cache in-memory to server stats in O(1) complexity
  - It continuously keeps computing stats and keep the stats analytics cache fresh

- #### Block Stats Service

  - (`src/block-stats`) is a stateless service, takes block data as input and calculates stats.

## API for Block Fee Estimation

- The (`src/block-fees`) is a module which exposes an API for block stats.
- This API leverages the (`src/block-analytics-cache`), it retrieves pre-calculated stats from the statsCache in `O(1)` time, ensuring quick block fee estimations.
- Swagger for the api is available on the route `/api`

## Folder structure

```
.
├── docker-compose.yaml
├── Dockerfile
├── nest-cli.json
├── package.json
├── pnpm-lock.yaml
├── README.md
├── src
│   ├── app.module.ts
│   ├── block-analytics-cache
│   │   ├── block-analytics-cache.module.ts
│   │   ├── block-analytics-cache.service.spec.ts
│   │   └── block-analytics-cache.service.ts
│   ├── block-cache
│   │   ├── block-cache.module.ts
│   │   ├── block-cache.service.spec.ts
│   │   └── block-cache.service.ts
│   ├── block-fees
│   │   ├── block-fees.controller.spec.ts
│   │   ├── block-fees.controller.ts
│   │   ├── block-fees.module.ts
│   │   ├── block-fees.service.spec.ts
│   │   └── block-fees.service.ts
│   ├── block-stats
│   │   ├── block-stats.module.ts
│   │   ├── block-stats.service.spec.ts
│   │   └── block-stats.service.ts
│   ├── config
│   │   ├── config.module.ts
│   │   └── configuration.ts
│   ├── ethers
│   │   ├── ethers.module.ts
│   │   ├── ethers.spec.ts
│   │   └── ethers.ts
│   ├── filters
│   │   ├── http-exception.filter.ts
│   │   └── http-exceptions.ts
│   ├── health
│   │   ├── health.controller.ts
│   │   └── health.module.ts
│   ├── main.ts
│   └── types
│       └── ethers.ts
├── tsconfig.build.json
└── tsconfig.json
```
