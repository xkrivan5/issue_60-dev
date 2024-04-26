"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const protocol_1 = require("@apibara/protocol");
const starknet_1 = require("@apibara/starknet");
const starknet_2 = require("starknet");
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const toml = __importStar(require("toml"));
dotenv.config();
const configPath = process.env.CONFIG_PATH || 'config.toml';
const config = toml.parse(fs.readFileSync(configPath, 'utf-8'));
const tokensDecimals = [
    {
        //ETH
        ticker: "ETH",
        decimals: 18,
        address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    },
    {
        //USDT
        ticker: "USDT",
        decimals: 6,
        address: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8",
    },
    {
        //USDC
        ticker: "USDC",
        decimals: 6,
        address: "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8",
    },
    {
        //STRK
        ticker: "STRK",
        decimals: 18,
        address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    },
];
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        var _d;
        try {
            // Apibara streaming
            const client = new protocol_1.StreamClient({
                url: config.apibara.url,
                token: "dna_OuqPARXJbKrHK0SAczaO",
                onReconnect(err, retryCount) {
                    return __awaiter(this, void 0, void 0, function* () {
                        console.log("reconnect", err, retryCount);
                        // Sleep for 1 second before retrying.
                        yield new Promise((resolve) => setTimeout(resolve, 1000));
                        return { reconnect: true };
                    });
                },
            });
            const provider = new starknet_2.RpcProvider({
                nodeUrl: starknet_2.constants.NetworkName.SN_MAIN,
                chainId: starknet_2.constants.StarknetChainId.SN_MAIN,
            });
            const hashAndBlockNumber = yield provider.getBlockLatestAccepted();
            const block_number = hashAndBlockNumber.block_number;
            // The address of the swap event
            const key = starknet_1.FieldElement.fromBigInt(BigInt("0xe316f0d9d2a3affa97de1d99bb2aac0538e2666d0d8545545ead241ef0ccab"));
            // The contract that emits the event. The AVNU swap contract
            const address = starknet_1.FieldElement.fromBigInt(BigInt("0x04270219d365d6b017231b52e92b3fb5d7c8378b05e9abc97724537a80e93b0f"));
            //Initialize the filter
            const filter_test = starknet_1.Filter.create()
                .withHeader({ weak: false })
                .addEvent((ev) => ev.withFromAddress(address).withKeys([key]))
                .encode();
            // Configure the apibara client
            client.configure({
                filter: filter_test,
                batchSize: 1,
                cursor: starknet_1.StarkNetCursor.createWithBlockNumber(block_number),
            });
            try {
                // Start listening to messages
                for (var _e = true, client_1 = __asyncValues(client), client_1_1; client_1_1 = yield client_1.next(), _a = client_1_1.done, !_a; _e = true) {
                    _c = client_1_1.value;
                    _e = false;
                    const message = _c;
                    switch (message.message) {
                        case "data": {
                            if (!((_d = message.data) === null || _d === void 0 ? void 0 : _d.data)) {
                                continue;
                            }
                            for (const data of message.data.data) {
                                const block = starknet_1.v1alpha2.Block.decode(data);
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
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_e && !_a && (_b = client_1.return)) yield _b.call(client_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        catch (error) {
            console.error("Initialization failed", error);
            process.exit(1);
        }
    });
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
const axios = require('axios'); // Ensure axios is required at the top of your script
function handleEventAvnuSwap(header, event, receipt) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("STARTING TO HANDLE AVNUSWAP EVENT");
        // Ensure the event has data to process
        if (!event.data)
            return null;
        // Decode token and amount details
        const takerAddress = starknet_1.FieldElement.toHex(event.data[0]);
        const sellAddress = starknet_1.FieldElement.toHex(event.data[1]);
        const sellToken = tokensDecimals.find(token => token.address === sellAddress);
        const sellAddressDecimals = sellToken === null || sellToken === void 0 ? void 0 : sellToken.decimals;
        if (!sellAddressDecimals)
            return null; // Skip if sell token is not supported
        // Convert amounts using token decimal places
        const sellAmount = +(0, ethers_1.formatUnits)(starknet_2.uint256.uint256ToBN({
            low: starknet_1.FieldElement.toBigInt(event.data[2]),
            high: starknet_1.FieldElement.toBigInt(event.data[3]),
        }), sellAddressDecimals);
        const buyAddress = starknet_1.FieldElement.toHex(event.data[4]);
        const buyToken = tokensDecimals.find(token => token.address === buyAddress);
        const buyAddressDecimals = buyToken === null || buyToken === void 0 ? void 0 : buyToken.decimals;
        if (!buyAddressDecimals)
            return null; // Skip if buy token is not supported
        const buyAmount = +(0, ethers_1.formatUnits)(starknet_2.uint256.uint256ToBN({
            low: starknet_1.FieldElement.toBigInt(event.data[5]),
            high: starknet_1.FieldElement.toBigInt(event.data[6]),
        }), buyAddressDecimals);
        const beneficiary = starknet_1.FieldElement.toHex(event.data[7]);
        console.log("FINISHED HANDLING AVNUSWAP EVENT");
        // Construct the swap data and message for notification
        const message = `New swap on AvnuSwap:
      - Block: ${header.blockNumber}
      - Taker: ${takerAddress}
      - Sold ${sellAmount} ${sellToken === null || sellToken === void 0 ? void 0 : sellToken.ticker}
      - Bought ${buyAmount} ${buyToken === null || buyToken === void 0 ? void 0 : buyToken.ticker}
      - Beneficiary: ${beneficiary}`;
        // Send the POST request to Flask webhook
        try {
            yield axios.post('http://127.0.0.1:5000/webhook', {
                type: 'new_swap',
                message: message // Adjust the data sent to the webhook as per your Flask app's expectation
            });
            console.log("Notification sent to Flask app");
        }
        catch (error) {
            console.error("Failed to send notification", error);
        }
    });
}
function pingServer(url) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios.get(url);
            console.log('Server response:', response.data);
        }
        catch (error) {
            console.error('Failed to ping server:', error);
        }
    });
}
