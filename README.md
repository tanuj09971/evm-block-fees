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

- I've integrated Web3_proxy to distribute requests across multiple Web3 servers, preventing any single server from being overwhelmed. This enhances the reliability and scalability of my Web3 interactions. All the RPCs I am using are listed in the `example.toml` file

### Real-time Block Data Handling

- I'm using the Ethers.js library to establish a WebSocket provider, enabling real-time monitoring of new blocks on the blockchain.
- New block events, along with their associated transactions, are published to streamline downstream processing.

### Efficient Caching and Analytics

- #### Block Cache Service

  - A dedicated block cache service subscribes to the published new block events.
  - The service utilizes an LRU (Least Recently Used) cache to efficiently store transaction data from new blocks.
  - After appending new transactions to the cache, the block cache service publishes the updated block data for analytics processing.

- #### Block Analytics Cache Service

  - Subscribes to the events published by the block cache service.
  - Updates a stats cache for upcoming blocks, enabling calculation of block-related statistics

- #### Block Stats Service

  - Calculates BlockStats for specified ranges of blocks (e.g., [1, 5, 30]).
  - Updates the statsCache to provide fast access to statistical information.

## API for Block Fee Estimation

- The /block-fees/estimate API is exposed from the block fees controller.
- This API leverages the block fees service, which retrieves pre-calculated stats from the statsCache in `O(1)` time, ensuring quick block fee estimations.

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
