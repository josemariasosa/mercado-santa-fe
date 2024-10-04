const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

MLARGE = ethers.parseEther("1000000000000");

async function deployProtocolFixture() {
  const MercadoSantaFe = await ethers.getContractFactory("MercadoSantaFeHarness");
  const BodegaDeChocolates = await ethers.getContractFactory("BodegaDeChocolates");
  const MPETHToken = await ethers.getContractFactory("MPETHToken");
  const XOCToken = await ethers.getContractFactory("XOCToken");

  const [
    owner,
    alice,
    bob,
    carl,
  ] = await ethers.getSigners();

  /// Deploying dummy tokens.

  const MPETHTokenContract = await MPETHToken.deploy();
  await MPETHTokenContract.waitForDeployment();

  const XOCTokenContract = await XOCToken.deploy();
  await XOCTokenContract.waitForDeployment();

  /// Deploying markets.

  const BodegaContract = await BodegaDeChocolates.deploy(XOCTokenContract.target)

  const MercadoSantaFeContract = await MercadoSantaFe.deploy(
    MPETHTokenContract.target,
    BodegaContract.target
  );
  await MercadoSantaFeContract.waitForDeployment();






  // /// Upgradeable borrow contract
  // const BorrowVerdeContract = await upgrades.deployProxy(
  //   BorrowVerde,
  //   [
  //     // VERDE Token
  //     VerdeTokenContract.target,
  //     // Collateral Asset
  //     MPETHTokenContract.target,
  //     MPETHPriceFeedContract.target,
  //     ethers.parseEther("0.01"),
  //     // Protocol Operations
  //     owner.address,
  //     TreasuryVaultContract.target,
  //     // Initial Parameters
  //     [
  //       ethers.parseUnits("600000", 6), // Debt Cap
  //       5000, // Safe LTV
  //       7000, // Liquidation LTV
  //       500,  // Penalty
  //       800,  // Borrow rate per year
  //       10    // Borrow initial fee
  //     ]
  //   ],
  //   {
  //     initializer: "initializeHarness",
  //     unsafeAllow: ["constructor"]
  //   }
  // );
  // await BorrowVerdeContract.waitForDeployment();

  // const SwapToMpEthOnLineaV1Implementation = await upgrades.erc1967.getImplementationAddress(ProxyContract.target);
  // const adminAddress = await upgrades.erc1967.getAdminAddress(ProxyContract.target);

  /// Token allocation.

  await MPETHTokenContract.allocateTo(alice.address, ethers.parseEther("10"));
  await MPETHTokenContract.allocateTo(bob.address, ethers.parseEther("0.2"));
  await MPETHTokenContract.allocateTo(carl.address, ethers.parseEther("2"));

  await XOCTokenContract.allocateTo(alice.address, ethers.parseUnits("31000", 18));
  await XOCTokenContract.allocateTo(bob.address, ethers.parseUnits("11000", 18));
  await XOCTokenContract.allocateTo(carl.address, ethers.parseUnits("11000", 18));



  return {
    MercadoSantaFeContract,
    BodegaContract,
    MPETHTokenContract,
    XOCTokenContract,
    owner,
    alice,
    bob,
    carl,
  };
}

module.exports = {
  deployProtocolFixture
};