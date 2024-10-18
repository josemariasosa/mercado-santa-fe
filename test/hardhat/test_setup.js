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
    USDCTokenContract.target,
    BodegaContract.target,
    USDToMXNOracleContract.target,
    ethers.parseUnits("10", 6) // 10 usd
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