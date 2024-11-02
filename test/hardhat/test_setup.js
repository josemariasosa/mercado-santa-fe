const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

MLARGE = ethers.parseEther("1000000000000");

async function deployProtocolFixture() {
  const MercadoSantaFe = await ethers.getContractFactory("MercadoSantaFeHarness");
  const BodegaDeChocolates = await ethers.getContractFactory("BodegaDeChocolates");
  const USDCToken = await ethers.getContractFactory("USDCToken");
  const XOCToken = await ethers.getContractFactory("XOCToken");
  const USDToMXNOracle = await ethers.getContractFactory("USDToMXNOracle");

  const [
    owner,
    alice,
    bob,
    carl,
  ] = await ethers.getSigners();

  /// Deploying dummy tokens.

  const USDCTokenContract = await USDCToken.deploy();
  await USDCTokenContract.waitForDeployment();

  const XOCTokenContract = await XOCToken.deploy();
  await XOCTokenContract.waitForDeployment();

  const USDToMXNOracleContract = await USDToMXNOracle.deploy();
  await USDToMXNOracleContract.waitForDeployment();

  /// Deploying markets.

  const BodegaContract = await BodegaDeChocolates.deploy(XOCTokenContract.target, owner.address);
  await BodegaContract.waitForDeployment();

  const MercadoSantaFeContract = await MercadoSantaFe.deploy(
    // IERC20 _collateral,
    USDCTokenContract.target,
    // IBodegaDeChocolates _bodega,
    BodegaContract.target,
    // IPriceFeed _collatToPesosOracle,
    USDToMXNOracleContract.target,
    // uint256 _minCollateralAmount,
    ethers.parseUnits("10", 6), // 10 usd
    // uint256 _maxCreditAmount, // 10,000 pesos. Use smalls values for testing.
    ethers.parseUnits("10000", 18),
    // uint256 _minCreditAmount, //    100 pesos.
    ethers.parseUnits("100", 18),
    // uint16 _baseApyBp,
    800, // 8%
    // uint16 _maxAdditionalApyBp
    3200, // 32%
  );
  await MercadoSantaFeContract.waitForDeployment();

  await BodegaContract.updateMercado(MercadoSantaFeContract.target);

  /// Token allocation.

  await USDCTokenContract.allocateTo(alice.address, ethers.parseUnits("1000", 6));
  await USDCTokenContract.allocateTo(bob.address, ethers.parseUnits("200", 6));
  await USDCTokenContract.allocateTo(carl.address, ethers.parseUnits("30", 6));

  await XOCTokenContract.allocateTo(bob.address, ethers.parseUnits("110000", 18));

  return {
    MercadoSantaFeContract,
    BodegaContract,
    USDCTokenContract,
    XOCTokenContract,
    USDToMXNOracleContract,
    owner,
    alice,
    bob,
    carl,
  };
}

module.exports = {
  deployProtocolFixture
};