const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");

console.log("Network: %s", hre.network.name);

ADDRESSBOOK = {
  base: {
    "USDMXN": "0x9C2ec31ECeCcD6394Fd0b810d439378805688b3D",
    "USDC": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    "XOC": "0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf",
    "USDCUSD": "0x7e860098F58bBFC8648a4311b374B1D669a2bc6B",
    "USDCToMXNPriceFeed": "0x85e2a5B46DB3Dc1E78E3238d7Cd80B3ff5bB0951",
    "BodegaDeChocolates": "0x9Deb4F3c3C0E343Cf0903598F37B2C13622a0B32",
    "MercadoSantaFe": "0xd10810E5a0773D417f5DABad107C50420e409689",
  }
}

async function main() {

  const [owner] = await ethers.getSigners();

  console.log("Owner address: ", owner.address);
  console.log("balance: ", ethers.formatEther(await hre.ethers.provider.getBalance(owner.address)));

  /// Protocol main contracts
  const MercadoSantaFe = await ethers.getContractFactory("MercadoSantaFe");
  const BodegaDeChocolates = await ethers.getContractFactory("BodegaDeChocolates");
  const USDCToken = await ethers.getContractFactory("USDCToken");
  const XOCToken = await ethers.getContractFactory("XOCToken");
  const USDCToMXNPriceFeed = await ethers.getContractFactory("USDCToMXNPriceFeed");

  // ***********************
  // * Deploying contracts *
  // ***********************

//   /// MOCK 🦧 DEPLOYING CONTRACTS
//   const USDCToMXNPriceFeedContract = await USDCToMXNPriceFeed.deploy(
//     // address _USDCToUSDPriceFeed,
//     ADDRESSBOOK[hre.network.name]["USDCUSD"],
//     // address _USDToMXNPriceFeed
//     ADDRESSBOOK[hre.network.name]["USDMXN"]
//   );
//   await USDCToMXNPriceFeedContract.waitForDeployment();
//   console.log(USDCToMXNPriceFeedContract.target);
//   console.log("Deploying USDCToMXNPriceFeedContract... DONE!");

  // const BodegaContract = await BodegaDeChocolates.deploy(ADDRESSBOOK[hre.network.name]["XOC"], owner.address);
  // await BodegaContract.waitForDeployment();
  // console.log(BodegaContract.target);
  // console.log("Deploying BodegaContract... DONE!");

  // const MercadoSantaFeContract = await MercadoSantaFe.deploy(
  //   // USDCTokenContract.target,
  //   ADDRESSBOOK[hre.network.name]["USDC"],
  //   // BodegaContract.target,
  //   ADDRESSBOOK[hre.network.name]["BodegaDeChocolates"],
  //   // USDToMXNOracleContract.target,
  //   ADDRESSBOOK[hre.network.name]["USDCToMXNPriceFeed"],
  //   // ethers.parseUnits("10", 6) // 10 usd
  //   ethers.parseUnits("10", 6)
  // );
  // await MercadoSantaFeContract.waitForDeployment();
  // console.log(MercadoSantaFeContract.target);
  // console.log("Deploying MercadoSantaFeContract... DONE!");

  const BodegaContract = await BodegaDeChocolates.attach(ADDRESSBOOK[hre.network.name]["BodegaDeChocolates"]);
  await BodegaContract.updateMercado(ADDRESSBOOK[hre.network.name]["MercadoSantaFe"]);

//   const USDTTokenContract = await USDTToken.deploy();
//   await USDTTokenContract.waitForDeployment();
//   console.log("Deploying USDTTokenContract... DONE!");

//   /// Deploying Price Feeds.
//   const MetaPoolETHOracleContract = await MetaPoolETHOracle.deploy(
//     owner.address,
//     ethers.parseEther("1.077092343808322638") // _initialMpETHPriceInETH 2024-09-02
//   );
//   await MetaPoolETHOracleContract.waitForDeployment();
//   console.log("Deploying MetaPoolETHOracleContract... DONE!");

//   const MPETHPriceFeedContract = await MPETHPriceFeed.deploy(
//     ADDRESSBOOK[hre.network.name]["ETHUSD"],
//     MetaPoolETHOracleContract.target
//   );
//   await MPETHPriceFeedContract.waitForDeployment();
//   console.log("Deploying MPETHPriceFeedContract... DONE!");

//   /// Deploying VERDE token.
//   const VerdeTokenContract = await VerdeToken.deploy(owner.address);
//   await VerdeTokenContract.waitForDeployment();
//   console.log("Deploying VerdeTokenContract... DONE!");

//   /// Deploying Treasury Vault.
//   const TreasuryVaultContract = await TreasuryVault.deploy(
//     // address _owner,
//     owner.address,
//     // IVerdeToken _verdeToken
//     VerdeTokenContract.target
//   );
//   await TreasuryVaultContract.waitForDeployment();
//   console.log("Deploying TreasuryVaultContract... DONE!");

//   /// Deploying Swap and Borrow Verde.
//   const SwapVerdeContract = await SwapVerde.deploy(
//     // VERDE Token
//     VerdeTokenContract.target,
//     // Treasury Vault
//     TreasuryVaultContract.target,
//     // Alternative Stablecoin
//     USDTTokenContract.target,
//     ADDRESSBOOK[hre.network.name]["USDCUSD"],
//     // Protocol Operations
//     owner.address,
//     35, // 0.35% swap fee
//     ethers.parseUnits("200000", 6) // Liquidity Cap
//   );
//   await SwapVerdeContract.waitForDeployment();
//   console.log("Deploying SwapVerdeContract... DONE!");

//   const BorrowVerdeContract = await upgrades.deployProxy(
//     BorrowVerde,
//     [
//       // VERDE Token
//       VerdeTokenContract.target,
//       // Collateral Asset
//       MPETHTokenContract.target,
//       MPETHPriceFeedContract.target,
//       ethers.parseEther("0.01"),
//       // Protocol Operations
//       owner.address,
//       TreasuryVaultContract.target,
//       // Initial Parameters
//       [
//         ethers.parseUnits("600000", 6), // Debt Cap
//         5000, // Safe LTV
//         7000, // Liquidation LTV
//         500,  // Penalty
//         800,  // Borrow rate per year
//         10    // Borrow initial fee
//       ]
//     ],
//     {
//       initializer: "initialize",
//       unsafeAllow: ["constructor"]
//     }
//   );
//   await BorrowVerdeContract.waitForDeployment();
//   console.log("Deploying BorrowVerdeContract... DONE!");

//   const ProxyBorrowImplementation = await upgrades.erc1967.getImplementationAddress(BorrowVerdeContract.target);
//   const adminProxyBorrowAddress = await upgrades.erc1967.getAdminAddress(BorrowVerdeContract.target);

//   /// Deploying staking VERDE and Stable.
//   const StakedVerdeContract = await StakedVerde.deploy(VerdeTokenContract.target);
//   await StakedVerdeContract.waitForDeployment();
//   console.log("Deploying StakedVerdeContract... DONE!");

//   const StakedStableContract = await StakedStable.deploy(StakedVerdeContract.target);
//   await StakedStableContract.waitForDeployment();
//   console.log("Deploying StakedStableContract... DONE!");

//   /// INITIALIZATION of the protocol.
//   await VerdeTokenContract.connect(owner).addMintAndBurnProtocol(SwapVerdeContract.target);
//   await VerdeTokenContract.connect(owner).addMintAndBurnProtocol(BorrowVerdeContract.target);

//   // Summary
//   console.log("MPETHTokenContract: --------: ", MPETHTokenContract.target);
//   console.log("USDTTokenContract: ---------: ", USDTTokenContract.target);
//   console.log("ETHToUSDOracleContract: ----: ", ADDRESSBOOK[hre.network.name]["ETHUSD"]);
//   console.log("USDTToUSDOracleContract: ---: ", ADDRESSBOOK[hre.network.name]["USDCUSD"]);
//   console.log("MetaPoolETHOracleContract: -: ", MetaPoolETHOracleContract.target);
//   console.log("MPETHPriceFeedContract: ----: ", MPETHPriceFeedContract.target);
//   console.log("VerdeTokenContract: --------: ", VerdeTokenContract.target);
//   console.log("TreasuryVaultContract: -----: ", TreasuryVaultContract.target);
//   console.log("SwapVerdeContract: ---------: ", SwapVerdeContract.target);
//   console.log("BorrowVerdeContract: -------: ", BorrowVerdeContract.target);
//   console.log("ProxyBorrowImplementation: -: ", ProxyBorrowImplementation);
//   console.log("adminProxyBorrowAddress: ---: ", adminProxyBorrowAddress);
//   console.log("StakedVerdeContract: -------: ", StakedVerdeContract.target);
//   console.log("StakedStableContract: ------: ", StakedStableContract.target);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});