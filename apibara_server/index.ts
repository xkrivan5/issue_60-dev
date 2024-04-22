import { StreamClient } from "@apibara/protocol";
import {
  Filter,
  StarkNetCursor,
  v1alpha2,
  FieldElement,
} from "@apibara/starknet";
import { RpcProvider, constants, provider, uint256 } from "starknet";
import { formatUnits } from "ethers";
import * as dotenv from "dotenv";
import { BlockNumber } from "starknet";
import * as fs from "fs";
import * as toml from "toml";
dotenv.config();

const configPath = process.env.CONFIG_PATH || 'config.toml';
const config = toml.parse(fs.readFileSync(configPath, 'utf-8'));

const tokensDecimals = [
  {
    //ETH
    ticker: "ETH",
    decimals: 18,
    address:
      "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
  },
  {
    //USDT
    ticker: "USDT",
    decimals: 6,
    address:
      "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
  },
  {
    //USDC
    ticker: "USDC",
    decimals: 6,
    address:
      "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
  },
  {
    //STRK
    ticker: "STRK",
    decimals: 18,
    address:
      "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  },
];



async function main() {
  try {
    // Apibara streaming
    const client = new StreamClient({
      url: config.apibara.url,
      token: "dna_OuqPARXJbKrHK0SAczaO",
      async onReconnect(err, retryCount) {
        console.log("reconnect", err, retryCount);
        // Sleep for 1 second before retrying.
        await new Promise((resolve) => setTimeout(resolve, 1000));

        return { reconnect: true };
      },
    });

    const provider = new RpcProvider({
      nodeUrl: constants.NetworkName.SN_MAIN,
      chainId: constants.StarknetChainId.SN_MAIN,
    });
    const hashAndBlockNumber = await provider.getBlockLatestAccepted();
    const block_number = hashAndBlockNumber.block_number;
    // The address of the swap event
    const key = FieldElement.fromBigInt(
      BigInt(
        "0xe316f0d9d2a3affa97de1d99bb2aac0538e2666d0d8545545ead241ef0ccab",
      ),
    );
    // The contract that emits the event. The AVNU swap contract
    const address = FieldElement.fromBigInt(
      BigInt(
        "0x04270219d365d6b017231b52e92b3fb5d7c8378b05e9abc97724537a80e93b0f",
      ),
    );

    //Initialize the filter
    const filter_test = Filter.create()
      .withHeader({ weak: false })
      .addEvent((ev) => ev.withFromAddress(address).withKeys([key]))
      .encode();

    // Configure the apibara client
    client.configure({
      filter: filter_test,
      batchSize: 1,
      cursor: StarkNetCursor.createWithBlockNumber(block_number),
    });

    // Start listening to messages
    for await (const message of client) {
      switch (message.message) {
        case "data": {
          if (!message.data?.data) {
            continue;
          }
          for (const data of message.data.data) {
            const block = v1alpha2.Block.decode(data);
            const { header, events, transactions } = block;
            if (!header || !transactions) {
              continue;
            }
            console.log("Block " + header.blockNumber);
            console.log("Events", events.length);

            for (const event of events) {
              console.log(event);
              if (event.event && event.receipt) {
                handleEventAvnuSwap(header, event.event, event.receipt);
              }
            }
          }
          break;
        }
        case "invalidate": {
          break;
        }
        case "heartbeat": {
          console.log("Received heartbeat");
          pingServer('http://127.0.0.1:5000/ping');
          break;
        }
      }
    }
  } catch (error) {
    console.error("Initialization failed", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

  const axios = require('axios'); // Ensure axios is required at the top of your script

  async function handleEventAvnuSwap(
    header: v1alpha2.IBlockHeader,
    event: v1alpha2.IEvent,
    receipt: v1alpha2.ITransactionReceipt,
  ) {
    console.log("STARTING TO HANDLE AVNUSWAP EVENT");
    
    // Ensure the event has data to process
    if (!event.data) return null;
  
    // Decode token and amount details
    const takerAddress = FieldElement.toHex(event.data[0]);
    const sellAddress = FieldElement.toHex(event.data[1]);
    const sellToken = tokensDecimals.find(token => token.address === sellAddress);
    const sellAddressDecimals = sellToken?.decimals;
  
    if (!sellAddressDecimals) return null; // Skip if sell token is not supported
  
    // Convert amounts using token decimal places
    const sellAmount = +formatUnits(
      uint256.uint256ToBN({
        low: FieldElement.toBigInt(event.data[2]),
        high: FieldElement.toBigInt(event.data[3]),
      }),
      sellAddressDecimals,
    );
  
    const buyAddress = FieldElement.toHex(event.data[4]);
    const buyToken = tokensDecimals.find(token => token.address === buyAddress);
    const buyAddressDecimals = buyToken?.decimals;
  
    if (!buyAddressDecimals) return null; // Skip if buy token is not supported
  
    const buyAmount = +formatUnits(
      uint256.uint256ToBN({
        low: FieldElement.toBigInt(event.data[5]),
        high: FieldElement.toBigInt(event.data[6]),
      }),
      buyAddressDecimals,
    );
  
    const beneficiary = FieldElement.toHex(event.data[7]);
  
    console.log("FINISHED HANDLING AVNUSWAP EVENT");
  
    // Construct the swap data and message for notification
    const message = `New swap on AvnuSwap:
      - Block: ${header.blockNumber}
      - Taker: ${takerAddress}
      - Sold ${sellAmount} ${sellToken?.ticker}
      - Bought ${buyAmount} ${buyToken?.ticker}
      - Beneficiary: ${beneficiary}`;
  
    // Send the POST request to Flask webhook
    try {
      await axios.post('http://127.0.0.1:5000/webhook', {
        type: 'new_swap',
        message: message  // Adjust the data sent to the webhook as per your Flask app's expectation
      });
      console.log("Notification sent to Flask app");
    } catch (error) {
      console.error("Failed to send notification", error);
    }
}

async function pingServer(url: string) {
    try {
      const response = await axios.get(url);
      console.log('Server response:', response.data);
    } catch (error) {
      console.error('Failed to ping server:', error);
    }
}
  
// import { StreamClient } from "@apibara/protocol";
// import { Filter, StarkNetCursor, v1alpha2, FieldElement } from "@apibara/starknet";
// import { RpcProvider, constants, uint256 } from "starknet";
// import { formatUnits } from "ethers";
// import * as fs from "fs";
// import * as toml from "toml";

// // Load TOML configuration
// const config = toml.parse(fs.readFileSync('/Users/krivanekadam/Documents/Projects/WEB3/StarkNet/issue_60/src/config.toml', 'utf-8'));

// const tokensDecimals = [
//   { ticker: "ETH", decimals: 18, address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7" },
//   { ticker: "USDT", decimals: 6, address: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8" },
//   { ticker: "USDC", decimals: 6, address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8" },
//   { ticker: "STRK", decimals: 18, address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d" },
// ];

// async function main() {
//   try {
//     const client = new StreamClient({
//       url: config.apibara.url,
//       token: config.apibara.token,
//       async onReconnect(err, retryCount) {
//         console.log("Reconnect attempt", err, retryCount);
//         await new Promise(resolve => setTimeout(resolve, 1000));
//         return { reconnect: true };
//       },
//     });

//     const provider = new RpcProvider({
//       nodeUrl: config.starknet.nodeUrl,
//       chainId: constants.StarknetChainId[config.starknet.chainId as keyof typeof constants.StarknetChainId],
//     });

//     const hashAndBlockNumber = await provider.getBlockLatestAccepted();
//     const block_number = hashAndBlockNumber.block_number;
//     const key = FieldElement.fromBigInt(BigInt("0xe316f0d9d2a3affa97de1d99bb2aac0538e2666d0d8545545ead241ef0ccab"));
//     const address = FieldElement.fromBigInt(BigInt("0x04270219d365d6b017231b52e92b3fb5d7c8378b05e9abc97724537a80e93b0f"));

//     const filter_test = Filter.create()
//       .withHeader({ weak: false })
//       .addEvent(ev => ev.withFromAddress(address).withKeys([key]))
//       .encode();

//     client.configure({
//       filter: filter_test,
//       batchSize: 1,
//       cursor: StarkNetCursor.createWithBlockNumber(block_number),
//     });

//     for await (const message of client) {
//       switch (message.message) {
//         case "data": {
//           if (!message.data?.data) continue;
//           for (const data of message.data.data) {
//             const block = v1alpha2.Block.decode(data);
//             const { header, events, transactions } = block;
//             if (!header || !transactions) continue;
//             console.log("Block " + header.blockNumber);
//             console.log("Events", events.length);
//             for (const event of events) {
//               if (event.event && event.receipt) {
//                 handleEventAvnuSwap(header, event.event, event.receipt);
//               }
//             }
//           }
//           break;
//         }
//         case "invalidate":
//           break;
//         case "heartbeat":
//           console.log("Received heartbeat");
//           pingServer('http://127.0.0.1:5000/ping');
//           break;
//       }
//     }
//   } catch (error) {
//     console.error("Initialization failed", error);
//     process.exit(1);
//   }
// }

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });

// const axios = require('axios'); // Ensure axios is required at the top of your script

// async function handleEventAvnuSwap(header: v1alpha2.IBlockHeader, event: v1alpha2.IEvent, receipt: v1alpha2.ITransactionReceipt) {
//   console.log("STARTING TO HANDLE AVNUSWAP EVENT");
//   if (!event.data) return null;
//   const takerAddress = FieldElement.toHex(event.data[0]);
//   const sellAddress = FieldElement.toHex(event.data[1]);
//   const sellToken = tokensDecimals.find(token => token.address === sellAddress);
//   const sellAddressDecimals = sellToken?.decimals;
//   if (!sellAddressDecimals) return null; // Skip if sell token is not supported
//   const sellAmount = +formatUnits(uint256.uint256ToBN({ low: FieldElement.toBigInt(event.data[2]), high: FieldElement.toBigInt(event.data[3]) }), sellAddressDecimals);
//   const buyAddress = FieldElement.toHex(event.data[4]);
//   const buyToken = tokensDecimals.find(token => token.address === buyAddress);
//   const buyAddressDecimals = buyToken?.decimals;
//   if (!buyAddressDecimals) return null; // Skip if buy token is not supported
//   const buyAmount = +formatUnits(uint256.uint256ToBN({ low: FieldElement.toBigInt(event.data[5]), high: FieldElement.toBigInt(event.data[6]) }), buyAddressDecimals);
//   const beneficiary = FieldElement.toHex(event.data[7]);
//   console.log("FINISHED HANDLING AVNUSWAP EVENT");
//   const message = `New swap on AvnuSwap:\n- Block: ${header.blockNumber}\n- Taker: ${takerAddress}\n- Sold ${sellAmount} ${sellToken?.ticker}\n- Bought ${buyAmount} ${buyToken?.ticker}\n- Beneficiary: ${beneficiary}`;
//   try {
//     await axios.post('http://127.0.0.1:5000/webhook', { type: 'new_swap', message: message });
//     console.log("Notification sent to Flask app");
//   } catch (error) {
//     console.error("Failed to send notification", error);
//   }
// }

// async function pingServer(url: string) {
//   try {
//     const response = await axios.get(url);
//     console.log('Server response:', response.data);
//   } catch (error) {
//     console.error('Failed to ping server:', error);
//   }
// }
