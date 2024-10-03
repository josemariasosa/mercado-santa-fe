const util = require("util");
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const {
  deployProtocolFixture
} = require("./test_setup");

const MLARGE = ethers.parseEther("100000000");
const ONE_DAY_IN_SECS_PLUS = (24 * 60 * 60) + 1;

describe("Mercado Santa Fe 🏗️ - Borrow and Lending protocol ----", function () {
  describe("Deploy", function () {
    it("[REFERENCE 🙊] Initialization parameters are correct.", async function () {
      // const {
      //   MPETHTokenContract,
      //   VerdeTokenContract,
      //   BorrowVerdeContract,
      //   MPETHPriceFeedContract,
      //   TreasuryVaultContract,
      //   owner,
      //   alice,
      // } = await loadFixture(deployVerdeV1ProtocolFixture);

      // for (i = 0; i < 100; i++) {
      //   await time.increase(ONE_DAY_IN_SECS_PLUS);
      //   await BorrowVerdeContract.accrue();
      // }

      // expect(await BorrowVerdeContract.owner()).to.be.equal(owner.address);
      // expect(await BorrowVerdeContract.verdeToken()).to.be.equal(VerdeTokenContract.target);
      // expect(await BorrowVerdeContract.collatAsset()).to.be.equal(MPETHTokenContract.target);
      // expect(await BorrowVerdeContract.collatToUsdOracle()).to.be.equal(MPETHPriceFeedContract.target);
      // expect(await BorrowVerdeContract.treasuryVault()).to.be.equal(TreasuryVaultContract.target);
      // expect(await BorrowVerdeContract.minCollatAmount()).to.be.equal(ethers.parseEther("0.01"));

      // expect(await BorrowVerdeContract.safeLtvBp()).to.be.equal(5000);
      // expect(await BorrowVerdeContract.liquidationLtvBp()).to.be.equal(7000);
      // expect(await BorrowVerdeContract.liquidationPenaltyBp()).to.be.equal(500);
    });

    it("Invalid basis points limits MUST revert.", async function () {
      const {
        MercadoSantaFeContract,
        MPETHTokenContract,
        XOCTokenContract,
        owner,
        alice,
        bob,
        carl,
      } = await loadFixture(deployProtocolFixture);

      const loan = {
        owner: alice.address,
        amount: ethers.parseUnits("1234", 18),
        totalPayment: 0,
        installments: 3,
        apy: 800,
        createdAt: await MercadoSantaFeContract.test__getNow(),
        duration: 3 * 4 * 7 * 24 * 60 * 60, // aprox 3 months
        attachedCollateral: ethers.parseUnits("500", 18),
      };

      await MercadoSantaFeContract.test__validateLoan(loan);

      console.log(loan);

      console.log(await MercadoSantaFeContract.test__loanDebt(loan));

      let _status;
      for (let i = 0; i < 3; i++) {
        if (i == 0) {
          // we shoud be in installment 0.
          expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
          _status = await MercadoSantaFeContract.test__loanDebt(loan);
          let maturedDebt =  _status.maturedDebt; // in pesos
          let nextInstallment = _status.nextInstallment; // in pesos
          let remainingDebt = _status[2];
          // expect(await MercadoSantaFeContract.test__loanDebt(loan)).to.be.equal(0);
        }
      }


    });
  });
});