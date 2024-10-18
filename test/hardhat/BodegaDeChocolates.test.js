const util = require("util");
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const {
  deployProtocolFixture
} = require("./test_setup");
const exp = require("constants");

const DURATION_3_MONTHS = 3 * 4 * 7 * 24 * 60 * 60;
const DURATION_1_MONTHS = 1 * 4 * 7 * 24 * 60 * 60;
const DURATION_1_DAY = 1 * 24 * 60 * 60;
const DURATION_3_DAY = 3 * 24 * 60 * 60;
const DURATION_1_YEAR = 365 * 24 * 60 * 60;
const DURATION_1_WEEK = 7 * 24 * 60 * 60;
const DURATION_3_WEEK = 3 * 7 * 24 * 60 * 60;

function calcGrandTotal(initialAmount, apy, fee) {
  const debt = (initialAmount * (10000n+apy) / 10000n);
  return debt > 0 ? debt + fee : 0;
}

const MLARGE = ethers.parseEther("100000000");
const ONE_DAY_IN_SECS_PLUS = (24 * 60 * 60) + 1;

describe("Bodega de Chocolates 🍫 ----", function () {
  describe("Adding and removing liquidity", function () {
    it("Simple, with NO loans. Withdraw all liquidity.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialSupply = await XOCTokenContract.balanceOf(bob.address);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(initialSupply, bob.address);

      expect(await XOCTokenContract.balanceOf(bob.address)).to.be.equal(0);
      expect(await BodegaContract.totalSupply()).to.be.equal(initialSupply);
      expect(await BodegaContract.totalAssets()).to.be.equal(initialSupply);

      const initialShares = await BodegaContract.balanceOf(bob.address);
      expect(await BodegaContract.availableBalance(bob.address)).to.be.equal(0);
      await BodegaContract.connect(bob).redeem(initialShares, bob.address, bob.address);
      expect(await BodegaContract.availableBalance(bob.address)).to.be.equal(initialSupply);

      expect(await XOCTokenContract.balanceOf(bob.address)).to.be.equal(0);
      

      // await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      // await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);
      // expect(await MercadoSantaFeContract.getUserCollat(alice.address)).to.be.equal(initialCollat);
      // expect(await MercadoSantaFeContract.getActiveLoans(alice.address)).to.be.equal(0);
      // expect(await MercadoSantaFeContract.getUserDebt(alice.address)).to.be.equal(0);

      // const borrowAmount = await MercadoSantaFeContract.estimateLoanAmount(borrowCollat, 6000);
      // // console.log(ethers.formatEther(borrowAmount));

      // const apy = await MercadoSantaFeContract.calculateAPY(borrowAmount, DURATION_3_MONTHS, borrowCollat);

      // /// Create first loan.
      // await MercadoSantaFeContract.connect(alice).borrow(
      //   [
      //     // uint256 amount;
      //     borrowAmount,
      //     // uint8 installments;
      //     3,
      //     // uint16 apy;
      //     apy,
      //     // uint32 duration;
      //     DURATION_3_MONTHS,
      //     // uint256 attachedCollateral;
      //     borrowCollat
      //   ]
      // );
      // expect(await MercadoSantaFeContract.getUserCollat(alice.address)).to.be.equal(initialCollat - borrowCollat);
      // expect(await MercadoSantaFeContract.getActiveLoans(alice.address)).to.be.equal(1);
      // expect(
      //   await MercadoSantaFeContract.getUserDebt(alice.address)
      // ).to.be.equal(calcGrandTotal(borrowAmount, apy, await MercadoSantaFeContract.getFixedLoanFee()));
    });

    it("With 1 loan.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = ethers.parseUnits("100", 6);
      const borrowCollat = ethers.parseUnits("90", 6);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);
      expect(await MercadoSantaFeContract.getUserCollat(alice.address)).to.be.equal(initialCollat);
      expect(await MercadoSantaFeContract.getActiveLoans(alice.address)).to.be.equal(0);
      expect(await MercadoSantaFeContract.getUserDebt(alice.address)).to.be.equal(0);

      const borrowAmount = await MercadoSantaFeContract.estimateLoanAmount(borrowCollat, 6000);
      // console.log(ethers.formatEther(borrowAmount));

      const apy = await MercadoSantaFeContract.calculateAPY(borrowAmount, DURATION_3_MONTHS, borrowCollat);

      /// Create first loan.
      await MercadoSantaFeContract.connect(alice).borrow(
        [
          // uint256 amount;
          borrowAmount,
          // uint8 installments;
          3,
          // uint16 apy;
          apy,
          // uint32 duration;
          DURATION_3_MONTHS,
          // uint256 attachedCollateral;
          borrowCollat
        ]
      );
      expect(await MercadoSantaFeContract.getUserCollat(alice.address)).to.be.equal(initialCollat - borrowCollat);
      expect(await MercadoSantaFeContract.getActiveLoans(alice.address)).to.be.equal(1);
      expect(
        await MercadoSantaFeContract.getUserDebt(alice.address)
      ).to.be.equal(calcGrandTotal(borrowAmount, apy, await MercadoSantaFeContract.getFixedLoanFee()));
    });
  });
});