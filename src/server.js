const ethers = require('ethers');
// const Web3 = require('web3');
const utils = require('./utils');
const { LPs } = require('./db');
const config = require('./config');

let g_lpInfo = [];

const scanCycle = 12000;

const chainId = 56;
const ETHEREUM_RPC_URL = chainId == 1 ? 'https://ethereum-rpc.publicnode.com' : chainId == 56 ? 'https://bscrpc.com' : '';
const scanUrl = chainId == 1 ? 'https://etherscan.io' : chainId == 56 ? 'https://bscscan.com' : chainId == 97 ? 'https://testnet.bscscan.com' : '';

// var web3WS = new Web3(ETHEREUM_RPC_URL);
const provider = new ethers.providers.JsonRpcProvider(ETHEREUM_RPC_URL);

const WETH_ADDRESS = chainId == 1 ? '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' : chainId == 56 ? '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c' : chainId == 97 ? '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd' : '';
const uniswapV2RouterAddress = chainId == 1 ? '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' : chainId == 56 ? '0x10ED43C718714eb63d5aA57B78B54704E256024E' : chainId == 97 ? '0xD99D1c33F9fC3444f8101754aBC46c52416550D1' : '';
const uniswapV3RouterAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'

const ERC20_ABI = require('./abis/erc20.json');
const UNISWAP_V2_POOL_ABI = require('./abis/uniswapV2.json');
const UNISWAP_V3_POOL_ABI = require('./abis/uniswapV3.json');

const LOG_MINT_V2_KECCACK = '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f'
const LOG_MINT_V3_KECCACK = '0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde'

const LOG_PAIR_CREATED_V2 = '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9'
const LOG_PAIR_CREATED_V3 = '0x783cca1c0412dd0d695e784568c96da2e9c22ff989357a2e8b1d9b2b4e6b7118'

const mintABI_v2 =
    [{
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "amount0", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "amount1", "type": "uint256" }
        ],
        "name": "Mint",
        "type": "event"
    }]

const mintABI_v3 =
    [{
        "anonymous": false,
        "inputs": [
            { "indexed": false, "internalType": "address", "name": "sender", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
            { "indexed": true, "internalType": "int24", "name": "tickLower", "type": "int24" },
            { "indexed": true, "internalType": "int24", "name": "tickUpper", "type": "int24" },
            { "indexed": false, "internalType": "uint128", "name": "amount", "type": "uint128" },
            { "indexed": false, "internalType": "uint256", "name": "amount0", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "amount1", "type": "uint256" }
        ],
        "name": "Mint",
        "type": "event"
    }]

const poolCreatedABI_v2 = [{
    "anonymous": false,
    "inputs": [
        {
            "indexed": true,
            "internalType": "address",
            "name": "token0",
            "type": "address"
        },
        {
            "indexed": true,
            "internalType": "address",
            "name": "token1",
            "type": "address"
        },
        {
            "indexed": false,
            "internalType": "address",
            "name": "pair",
            "type": "address"
        },
        {
            "indexed": false,
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
        }
    ],
    "name": "PairCreated",
    "type": "event"
}]

const poolCreatedABI_v3 = [{

    "anonymous": false,
    "inputs": [
        {
            "indexed": true,
            "internalType": "address",
            "name": "token0",
            "type": "address"
        },
        {
            "indexed": true,
            "internalType": "address",
            "name": "token1",
            "type": "address"
        },
        {
            "indexed": true,
            "internalType": "uint24",
            "name": "fee",
            "type": "uint24"
        },
        {
            "indexed": false,
            "internalType": "int24",
            "name": "tickSpacing",
            "type": "int24"
        },
        {
            "indexed": false,
            "internalType": "address",
            "name": "pool",
            "type": "address"
        }
    ],
    "name": "PoolCreated",
    "type": "event"
}]

const getTokensByUniv2PoolAddress = async (provider, pairAddress) => {

    try {
        
        const poolContract = new ethers.Contract(pairAddress, UNISWAP_V2_POOL_ABI, provider);

        var promises = [];
        
        promises.push(poolContract.token0())
        promises.push(poolContract.token1())

        const result = await Promise.all(promises)

        return { tokenA: result[0], tokenB: result[1] }

    } catch (err) {
        console.log(err)
    }

    return null;
};

const getTokensByUniv3PoolAddress = async (provider, pairAddress) => {

    try {
        // const poolContract = new web3.eth.Contract(UNISWAP_V3_POOL_ABI, pairAddress);
        const poolContract = new ethers.Contract(pairAddress, UNISWAP_V3_POOL_ABI, provider);

        var promises = [];
        promises.push(poolContract.token0());
        promises.push(poolContract.token1());

        const result = await Promise.all(promises)

        return { tokenA: result[0], tokenB: result[1] }

    } catch (err) {
        console.log(err)
    }

    return null;
};

const validatePool = (poolAddress, token0, amount0, token1, amount1, retVal) => {

    if (!poolAddress || !token0 || !token1) {
        return false
    }

    retVal.poolAddress = poolAddress
    // if (token0.toLowerCase() === uniconst.WETH_ADDRESS.toLowerCase() || token0.toLowerCase() === uniconst.USDT_ADDRESS.toLowerCase() || token0.toLowerCase() === uniconst.USDC_ADDRESS.toLowerCase()) {
    if (token0.toLowerCase() === WETH_ADDRESS.toLowerCase()) {
        retVal.primaryAddress = token1;
        retVal.primaryAmount = amount1;
        retVal.primaryIndex = 1;
        retVal.secondaryAddress = token0;
        retVal.secondaryAmount = amount0;
        // } else if (token1.toLowerCase() === uniconst.WETH_ADDRESS.toLowerCase() || token1.toLowerCase() === uniconst.USDT_ADDRESS.toLowerCase() || token1.toLowerCase() === uniconst.USDC_ADDRESS.toLowerCase()) {
    } else if (token1.toLowerCase() === WETH_ADDRESS.toLowerCase()) {
        retVal.primaryAddress = token0;
        retVal.primaryAmount = amount0;
        retVal.primaryIndex = 0;
        retVal.secondaryAddress = token1;
        retVal.secondaryAmount = amount1;
    } else {
        return false;
    }

    return true;
}

const checkFirstMint = async (provider, poolInfo, transactionHash) => {
    console.log('transactionHash: ', transactionHash);
    
    return new Promise (async (resolve, reject) => {
        
        try {
            // const tokenContract = new web3.eth.Contract(ERC20_ABI, poolInfo.secondaryAddress);
            const tokenContract = new ethers.Contract(poolInfo.secondaryAddress, ERC20_ABI, provider);
            const balance = await tokenContract.balanceOf(poolInfo.poolAddress);

            if (Number(balance) === Number(poolInfo.secondaryAmount)) {
                
                resolve(true)
            } else {

                let txReceipt = null;
                try {
                    // txReceipt = await web3.eth.getTransactionReceipt(transactionHash);
                    txReceipt = await provider.getTransactionReceipt(transactionHash);
                    
                } catch (error) {
                    
                    resolve(false);
                }

                if (txReceipt) {
                    
                    const poolCreatedLog = txReceipt.logs.find((item) => (item.topics[0] === LOG_PAIR_CREATED_V2 || item.topics[0] === LOG_PAIR_CREATED_V3));
                    if (poolCreatedLog && poolCreatedLog.topics && poolCreatedLog.topics.length > 0) {
                        
                        const isV2 = (poolCreatedLog.topics[0] === LOG_PAIR_CREATED_V2)
                        
                        const iface_v2 = new ethers.utils.Interface(poolCreatedABI_v2);
                        const iface_v3 = new ethers.utils.Interface(poolCreatedABI_v3);
                        const iface = isV2 ? iface_v2 : iface_v3;
                        // const poolCreatedLogData = web3.eth.abi.decodeLog(isV2 ? poolCreatedABI_v2.inputs : poolCreatedABI_v3.inputs,
                        //     poolCreatedLog.data,
                        //     poolCreatedLog.topics.slice(1));
                        // const poolCreatedLogData = iface.parseLog({ data: poolCreatedLog.data, topics: poolCreatedLog.topics.slice(1)});
                        const poolCreatedLogData = isV2 ?
                            iface_v2.decodeEventLog("PairCreated", poolCreatedLog.data, poolCreatedLog.topics.slice(0))
                            :
                            iface_v3.decodeEventLog("PoolCreated", poolCreatedLog.data, poolCreatedLog.topics.slice(0));
                        
                        if (poolCreatedLogData && (poolCreatedLogData.pair === poolInfo.poolAddress || poolCreatedLogData.pool === poolInfo.poolAddress)) {
                            console.log('[Debug 2nd]', balance, poolInfo.secondaryAmount, poolInfo.poolAddress)
                            resolve(true)
                        }
                    }
                }
            }

        } catch (err) {
            console.log('contract id', poolInfo)
            console.log(err)
        }
        
        resolve(false)
    })
    
}

const applyTokenSymbolAndDecimals = async (provider, poolInfo) => {

    try {
        // const tokenContract1 = new web3.eth.Contract(ERC20_ABI, poolInfo.primaryAddress);
        // const tokenContract2 = new web3.eth.Contract(ERC20_ABI, poolInfo.secondaryAddress);
        const tokenContract1 = new ethers.Contract(poolInfo.primaryAddress, ERC20_ABI, provider);
        const tokenContract2 = new ethers.Contract(poolInfo.secondaryAddress, ERC20_ABI, provider);


        let promises = []
        promises.push(tokenContract1.symbol());
        promises.push(tokenContract2.symbol());
        promises.push(tokenContract1.decimals());
        promises.push(tokenContract2.decimals());

        const result = await Promise.all(promises)

        poolInfo.primarySymbol = result[0]
        poolInfo.secondarySymbol = result[1]
        poolInfo.primaryDecimals = result[2]
        poolInfo.secondaryDecimals = result[3]

        console.log('poolInfo: ', result);
        return true

    } catch (err) {
        console.log(err)
    }

    poolInfo.primarySymbol = '*'
    poolInfo.secondarySymbol = '*'

    return false
}

const parseLog = async (provider, log, callback) => {

    console.log("===================parseLog=====================")
    // console.log("log.topics[0]", log)
    // console.log("log.topics[1]", log.topics[1])
    const logCode = log.topics[0]

    const toAddress = log.topics[1].toLowerCase()
    if (!toAddress) {
        return
    }


    console.log('logCode: ', logCode);
    switch (logCode) {

        case LOG_MINT_V2_KECCACK:
            
            if (toAddress === utils.addressToHex(uniswapV2RouterAddress)) {
                const iface_v2 = new ethers.utils.Interface(mintABI_v2);
                // const logData = web3.eth.abi.decodeLog(mintABI_v2.inputs, log.data, log.topics.slice(1));
                const logData = iface_v2.decodeEventLog("Mint", log.data, log.topics.slice(0));
                const pairAddress = log.address

                // console.log('logData: ', logData);

                const tokenResult = await getTokensByUniv2PoolAddress(provider, pairAddress)
                if (!tokenResult) {
                    return
                }
                
                const { tokenA, tokenB } = tokenResult
                const tokenA_amount = logData.amount0.toString()
                const tokenB_amount = logData.amount1.toString()

                let poolInfo = {};
                if (validatePool(pairAddress, tokenA, tokenA_amount, tokenB, tokenB_amount, poolInfo) === true) {

                    poolInfo.routerAddress = uniswapV2RouterAddress
                    poolInfo.version = 'v2'
                    checkFirstMint(provider, poolInfo, log.transactionHash).then(async result => {
                        console.log('checkFirstMint: ', result);
                        if (result) {
                            await applyTokenSymbolAndDecimals(provider, poolInfo)
                            let str = `${poolInfo.primarySymbol}/${poolInfo.secondarySymbol}`

                            console.log("------------");
                            console.log('\x1b[32m%s\x1b[0m', `[v2] Detected first mint [${str}] Token: ${poolInfo.primaryAddress} Pair: ${poolInfo.poolAddress}`);
                            console.log(`${scanUrl}/tx/${log.transactionHash}`);
                            console.log("------------");
                            console.log("TokenAmount: ", tokenA_amount, " : ", tokenB_amount);

                            if (callback) {
                                callback(poolInfo, 'v2')
                            }

                            if (true) { // Vercel Database(Product)
                                const _lp = await LPs.findOne({ poolAddress: poolInfo.poolAddress });
                                if (!_lp) {
                                    const totalCount = await LPs.countDocuments({});
                                    console.log("totalCount: ", totalCount);
                                    if (totalCount >= config.LP_COUNT) {
                                        LPs.findOneAndDelete({}, { sort: { createdAt: 1 } }, (err, doc) => {
                                            if (err) {
                                                console.error("mongoose error: ", err);
                                                return;
                                            }
                                            console.log('Deleted document: ', doc);
                                        })
                                    }

                                    const lpInfo = new LPs({
                                        poolAddress: poolInfo.poolAddress,
                                        primaryAddress: poolInfo.primaryAddress,
                                        primaryAmount: utils.convertAmountDecimals(poolInfo.primaryAmount, poolInfo.primaryDecimals),
                                        primaryIndex: poolInfo.primaryIndex,
                                        secondaryAddress: poolInfo.secondaryAddress,
                                        secondaryAmount: utils.convertAmountDecimals(poolInfo.secondaryAmount, poolInfo.secondaryDecimals),
                                        routerAddress: poolInfo.routerAddress,
                                        version: poolInfo.version,
                                        primarySymbol: poolInfo.primarySymbol,
                                        secondarySymbol: poolInfo.secondarySymbol,
                                        primaryDecimals: poolInfo.primaryDecimals,
                                        secondaryDecimals: poolInfo.secondaryDecimals,
                                    });
                                    await lpInfo.save();
                                } else {
                                    console.log("Already exist: ", _lp);
                                }
                            } else { // Global variable(Test)
                                if (g_lpInfo.length > config.LP_COUNT) {
                                    g_lpInfo.slice(1);
                                }

                                g_lpInfo.push(poolInfo);

                                console.log("g_lpInfo: ", g_lpInfo);
                            }
                        }
                    })
                }
            }

            break;

        case LOG_MINT_V3_KECCACK:
            
            break;
    }

}

let updateTime = 0;

const PairCreationMonitoring = async (blockNumber = 0, toBlockNumber = 0) => {

    try {
        provider.getLogs({
            fromBlock: blockNumber, //38565651, // blockNumber, //35807779,
            toBlock: toBlockNumber, //38565652, //toBlockNumber, // 35807780,
            topics: [[LOG_MINT_V2_KECCACK, LOG_MINT_V3_KECCACK], null]
        }, async function (error, events) {
            // console.log("Fail: ", events);
            
        }).then(async function (events) {
            // console.log("Success: ", events);

            if (events.length > 0) {
                await parseLog(provider, events[0]);
            }

        }).catch((err) => {
            console.error('Error: ', err);
        });

    } catch (error) {
        console.log("Something went wrong 2: " + error.message)
    }
    if (updateTime > 5) {
        console.log('Updating...');
        await updateDatabase();
        updateTime = 0;
    } else {
        updateTime ++;
    }
}

const getTokenAmount = async (provider, tokenAddress, targetAddress) => {

    try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

        return await tokenContract.balanceOf(targetAddress);
    } catch (err) {
        console.log(err)
    }

    return 0;
}

const updateDatabase = async () => {
    try {
        const allLps = await LPs.find({});
        await Promise.all(
            allLps.map( async(item) => {
                const newPrimaryAmount =  await getTokenAmount(provider, item.primaryAddress, item.poolAddress);
                const newSecondaryAmount =  await getTokenAmount(provider, item.secondaryAddress, item.poolAddress);
                item.primaryAmount = utils.convertAmountDecimals(newPrimaryAmount, item.primaryDecimals);
                item.secondaryAmount = utils.convertAmountDecimals(newSecondaryAmount, item.secondaryDecimals);
                if (item.secondaryAmount < 1e18) {
                    console.log('delete: ', item.secondaryAmount, item.primarySymbol);
                    await item.delete();
                } else {
                    console.log('save: ', item.secondaryAmount, item.primarySymbol);
                    await item.save();
                }
            })
        );
    } catch (err) {
        console.error('UpdateDatabase Error: ', err);
    }
}

var scanBlockNumber = 0;
var maxBlockNumber = 0;

const getBlockNumber_on_eth = () => {
    provider.getBlockNumber()
        .then((number) => {
            if (maxBlockNumber < number) {
                maxBlockNumber = number;
                if (scanBlockNumber == 0) {
                    scanBlockNumber = number;
                }
                // console.log("max block number", number);
            }
        }).catch((error) => {
            console.log("get eth_blocknumber error");
        });
    setTimeout(getBlockNumber_on_eth, scanCycle);
}

const getData_on_eth = async () => {

    let curMaxBlock = maxBlockNumber;
    if (scanBlockNumber != 0 && scanBlockNumber < curMaxBlock) {
        console.log('scanFrom : ', scanBlockNumber, " scanTo : ", curMaxBlock);
        try {
            await PairCreationMonitoring(scanBlockNumber, curMaxBlock);
            scanBlockNumber = curMaxBlock + 1;
        } catch (e) {
        }
    }
    setTimeout(getData_on_eth, scanCycle);
}

function main() {
    // PairCreationMonitoring();

    getBlockNumber_on_eth();
    getData_on_eth();
}

module.exports = {
    main,
    g_lpInfo
}