require('dotenv').config();
require("@nomicfoundation/hardhat-toolbox");
require("hardhat-contract-sizer");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.27",
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: false, // allow tests to run anyway
  },
  networks: {
    // hardhat: {
    //   // gas: 30000000,
    //   // gasLimit: 30000000,
    //   // maxFeePerGas: 55000000000,
    //   // maxPriorityFeePerGas: 55000000000,
    //   forking: {
    //     url: `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
    //     blockNumber: Number(process.env.BLOCK_NUMBER),
    //     // enabled: true,
    //     enabled: false,
    //   },
    //   chains: {
    //     42161: {
    //       hardforkHistory: {
    //         london: 23850000
    //       }
    //     }
    //   }
    // },
    // mainnet: {
    //   url: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
    //   accounts: {
    //     mnemonic: process.env.MNEMONIC,
    //   }
    // },
    base: {
      url: `https://base-mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: {
        mnemonic: process.env.MNEMONIC,
      }
    },
  },
  etherscan: {
    apiKey: {
      base: process.env.ETHERSCAN_KEY
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      },
    ]
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    // apiKey: process.env.ETHERSCAN_KEY //cspell:disable-line
  },
};
