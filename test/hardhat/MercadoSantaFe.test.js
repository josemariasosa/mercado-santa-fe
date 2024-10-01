const util = require("util");
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const {
  deployVerdeV1ProtocolFixture
} = require("./test_setup");

const MLARGE = ethers.parseEther("100000000");
const ONE_DAY_IN_SECS_PLUS = (24 * 60 * 60) + 1;

describe("Mercado Santa Fe 🏗️ - Borrow and Lending protocol ----", function () {
  describe("Deploy", function () {
    it("[REFERENCE 🙊] Initialization parameters are correct.", async function () {
      const {
        MPETHTokenContract,
        VerdeTokenContract,
        BorrowVerdeContract,
        MPETHPriceFeedContract,
        TreasuryVaultContract,
        owner,
        alice,
      } = await loadFixture(deployVerdeV1ProtocolFixture);

      for (i = 0; i < 100; i++) {
        await time.increase(ONE_DAY_IN_SECS_PLUS);
        await BorrowVerdeContract.accrue();
      }

      expect(await BorrowVerdeContract.owner()).to.be.equal(owner.address);
      expect(await BorrowVerdeContract.verdeToken()).to.be.equal(VerdeTokenContract.target);
      expect(await BorrowVerdeContract.collatAsset()).to.be.equal(MPETHTokenContract.target);
      expect(await BorrowVerdeContract.collatToUsdOracle()).to.be.equal(MPETHPriceFeedContract.target);
      expect(await BorrowVerdeContract.treasuryVault()).to.be.equal(TreasuryVaultContract.target);
      expect(await BorrowVerdeContract.minCollatAmount()).to.be.equal(ethers.parseEther("0.01"));

      expect(await BorrowVerdeContract.safeLtvBp()).to.be.equal(5000);
      expect(await BorrowVerdeContract.liquidationLtvBp()).to.be.equal(7000);
      expect(await BorrowVerdeContract.liquidationPenaltyBp()).to.be.equal(500);
    });

    it("Invalid basis points limits MUST revert.", async function () {
      const {
        BorrowVerdeContract,
      } = await loadFixture(deployVerdeV1ProtocolFixture);

      const validScenarios = [
        // safeLTV, Liquidation, Penalty
        [5000, 7000, 500],
        [5000, 7500, 500],
        [5000, 8000, 500],
        [5000, 8000, 1000],
        [7000, 7001, 0],
        [5000, 9000, 1000],
      ];

      const invalidScenarios = [
        [7000, 7000, 500],
        [5000, 7000, 1001],
        [7000, 7000, 0],
        [5000, 9100, 1000],
      ];

      for (let i = 0; i < validScenarios.length; i++) {
        await BorrowVerdeContract.test_validateBPLimits(validScenarios[i][0], validScenarios[i][1], validScenarios[i][2]);
      }

      for (let i = 0; i < invalidScenarios.length; i++) {
        await expect(
          BorrowVerdeContract.test_validateBPLimits(invalidScenarios[i][0], invalidScenarios[i][1], invalidScenarios[i][2])
        ).to.reverted;
      }
    });
  });
});