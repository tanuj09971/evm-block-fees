# EVM-BLOCK-FEES

EVM Block Fees is a versatile tool for calculating average native ETH transaction fees within customizable block ranges. It currently supports calculations for 1 block, 5 blocks, and 30 blocks, and can be easily extended to accommodate additional ranges.

## Installation (Intel, AMD)

Guide not designed to work on ARM like apple silicon

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
   - BLOCK_LOOKBACK: This is the list of number of N lookback blocks for which the stats should be serverd

   Please refer to the .env.example file for guidance on setting these variables appropriately.

   ```bash
   cp .env.example .env
   ```

4. Build and start the Docker containers using Docker Compose:

   ```bash
   docker compose up -d
   ```

5. Wait for Services to Start:

   After starting the containers, it's crucial to wait until both services (evm-block-fees and web3-proxy) are fully up and you get healthy status for web3-proxy before proceeding with further actions.

   Use the following command to monitor the status of the Docker services:

   ```bash
   docker ps
   ```

   This command lists all running Docker containers along with their names, images, status, and exposed ports. Ensure both evm-block-fees and web3-proxy services are running and their status is healthy.

6. Health check:

   Once the services are up and running, you can check the health of the App using the following command:

   ```bash
   curl http://localhost:3000/health
   ```

7. Access the API:

   Once the health check is successful, you can access the API using the following command:

   ```bash
   curl http://localhost:3000/v1/block-fees/estimate
   ```

```

## Technologies Used

- NestJS framework of Node.js
- RxJS for publishing and subscribing events
- Web3-Proxy by llama nodes [here]('https://github.com/llamanodes/web3-proxy')
- Ethers.js library to interact with Ethereum Blockchain

## Usage

### Optimized Web3 Interactions

- Web3 Proxy to distribute requests across multiple Web3 RPCs, preventing any single RPC from being overwhelmed. This enhances the reliability and scalability Web3 interactions with outside RPCs. The processes consuming this proxy keeps it as a sidecar process. All the RPCs are listed in the `web3-proxy.toml` file, can add or remove RPCs as per your requirement.

### Real-time Block Data Handling

- Ethers module (`src/ethers`) establishes a WebSocket connection with sidecar Web3 Proxy to listen to new block events, under the hood, it uses ethers.js and have advanced features implemented for downstream modules:-

- Block streaming using RxJS so dependent systems can subscribe to blocks and even subscribe to BlocksWithTransactions
- Handle missed block events in situation where websocket connection were interrupted
- Infinite Retries for RPC interactions
- Memoizes the block data and account bytecode, since determining if an address is an EOA or Contract requires fetching the bytecode of the account, this is a heavy operation as there maybe hundreds of transactions introducing new addreses per block and we will need to filterout the Payable Contract Calls to get the native-eth-only-transactions, so it is memoized to prevent multiple RPC calls for the same address.

### Efficient Caching and Analytics

- #### Block Cache Service

- (`src/block-cache`) A dedicated block cache service, subscribes to the RxJS new block data from ethers module
- Store block with transaction data in LRU cache
- Handle cache backfill on startup time to fill historical block data needed to serve stats of more than one block
- Publishes an RxJS even whenever the cache is updated with new block data (starts only after initial backfill), this allows downstream modules to perform any processing needed when new blocks are available
- Fill missing blocks even if upstream ethrs module miss publishing any block in sequential way
- Provides helper functions to know if block cache is fresh or not

- #### Block Analytics Cache Service

- (`src/block-analytics-cache`) A dedicated block analytics cache service, which subscribes to cache updates from the block cache service
- Retreives the block data with transactions data and call (`src/block-stats`) service, which analyses the block transations and computes statistics
- After computation of stats, for specific lookback number of blocks, it maintains an in-memory cache to serve stats in O(1) complexity directly from cache
- It continuously keeps computing stats and keep the stats analytics cache fresh

- #### Block Stats Service

- (`src/block-stats`) is a stateless service, takes block data as input and calculates stats.
- It filters out contract calls to payable functions transferring native ETH from both sender ('from') and recipient ('to') addresses, focusing exclusively on calculating average fees for native ETH transfers.

- ### Block Fee Module

- The (`src/block-fees`) is a module which exposes an API `/estimate` endpoint for block stats.
- This API leverages the (`src/block-analytics-cache`), it retrieves pre-calculated stats from the statsCache in `O(1)` time, ensuring quick block fee estimations.
- Additional endpoints for Health `/health` and for Swagger is available on the route `/api`

## Tests

```

docker compose run --rm evm-block-fees pnpm run test

```

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
│ ├── app.module.ts
│ ├── block-analytics-cache
│ │ ├── block-analytics-cache.module.ts
│ │ ├── block-analytics-cache.service.spec.ts
│ │ └── block-analytics-cache.service.ts
│ ├── block-cache
│ │ ├── block-cache.module.ts
│ │ ├── block-cache.service.spec.ts
│ │ └── block-cache.service.ts
│ ├── block-fees
│ │ ├── block-fees.controller.spec.ts
│ │ ├── block-fees.controller.ts
│ │ ├── block-fees.module.ts
│ │ ├── block-fees.service.spec.ts
│ │ └── block-fees.service.ts
│ ├── block-stats
│ │ ├── block-stats.module.ts
│ │ ├── block-stats.service.spec.ts
│ │ └── block-stats.service.ts
│ ├── config
│ │ ├── config.module.ts
│ │ └── configuration.ts
│ ├── ethers
│ │ ├── ethers.module.ts
│ │ ├── ethers.spec.ts
│ │ └── ethers.ts
│ ├── filters
│ │ ├── http-exception.filter.ts
│ │ └── http-exceptions.ts
│ ├── health
│ │ ├── health.controller.ts
│ │ └── health.module.ts
│ ├── main.ts
│ └── types
│ └── ethers.ts
├── tsconfig.build.json
└── tsconfig.json

```

## Known limitations

- In memory caching and memoization may only work for a single process, since multiple processes will not share the same cache and memoization.
- A large number of lookback blocks should be avoided as startup will take huge time backfilling historical blocks
- Repetative computation is not properly optimized and can be improved

## Assumptions

- This assignment is intended to asses the knowlage of typescript and blockachain development skills
- `O(1)` is achived in perspective of serving stats in consitant O(1) time and avoiding unpredictable performance degradation due to large number of lookback blocks or third party RPC calls via serving stats via cache and not having any computation/interactions done in request cycle
- Using AI generated code comments is fine

## Remaining and TODOs

- Complete the test cases and improve the coverage
- Add all missing stats
- Handle chain reorgs
```
