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
      // ).to.be.equal(calcGrandTotal(borrowAmount, apy, await MercadoSantaFeContract.fixedLoanFee()));
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

      /// Create first loan.
      await MercadoSantaFeContract.connect(alice).borrow(
        [
          // uint256 amount;
          borrowAmount,
          // uint8 installments;
          3,
          // uint32 duration;
          DURATION_3_MONTHS,
          // uint256 attachedCollateral;
          borrowCollat
        ]
      );
      expect(await MercadoSantaFeContract.getUserCollat(alice.address)).to.be.equal(initialCollat - borrowCollat);
      expect(await MercadoSantaFeContract.getActiveLoans(alice.address)).to.be.equal(1);

      const apy = (await MercadoSantaFeContract.getLoan(1)).apy;
      expect(
        await MercadoSantaFeContract.getUserDebt(alice.address)
      ).to.be.equal(calcGrandTotal(borrowAmount, apy, await MercadoSantaFeContract.fixedLoanFee()));
    });
  });

  describe("Paying 3 installments loans and remove liquidity", function () {
    it("All payments on time.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = ethers.parseUnits("100", 6);
      const borrowAmount = ethers.parseUnits("1000", 18); // mil pesitos 🦅

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).transfer(
        alice.address,
        (await XOCTokenContract.balanceOf(bob.address)) - borrowAmount
      );
      const initialLiquidity = await XOCTokenContract.balanceOf(bob.address);
      expect(initialLiquidity).to.be.equal(borrowAmount);
      // console.log("initial liq: ", ethers.formatEther(initialLiquidity));
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(initialLiquidity, bob.address);
      expect(await BodegaContract.totalAssets()).to.be.equal(initialLiquidity);
      // console.log("totalAssets: ", ethers.formatEther(await BodegaContract.totalAssets()));

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

      // const borrowAmount = await MercadoSantaFeContract.estimateLoanAmount(initialCollat, 6000);
      // console.log(ethers.formatEther(borrowAmount));

      const invariantTotalAssets = await MercadoSantaFeContract.getTotalDebt(borrowAmount, initialCollat);
      expect(await MercadoSantaFeContract.totalDeployedInLoans()).to.be.equal(0);
      /// Create first loan.
      await MercadoSantaFeContract.connect(alice).borrow(
        [
          // uint256 amount;
          borrowAmount,
          // uint8 installments;
          3,
          // uint32 duration;
          DURATION_3_WEEK,
          // uint256 attachedCollateral;
          initialCollat
        ]
      );

      console.log("value: ", await BodegaContract.convertToAssets(
        await BodegaContract.balanceOf(bob.address)
      ));

      const shares = await BodegaContract.balanceOf(bob.address);
      await BodegaContract.connect(bob).redeem(shares, bob.address, bob.address);
      console.log("In WOS: ", await BodegaContract.totalInWOS());


      // console.log(await MercadoSantaFeContract.getLoan(1));
      // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));
      expect(await MercadoSantaFeContract.totalDeployedInLoans()).to.be.equal(
        await MercadoSantaFeContract.getTotalDebt(borrowAmount, initialCollat)
      );
      expect(invariantTotalAssets).to.be.equal(await BodegaContract.totalAssets());
      // console.log("totalAssets: ", ethers.formatEther(await BodegaContract.totalAssets()));
      console.log("totalDeploy: ", ethers.formatEther(await MercadoSantaFeContract.totalDeployedInLoans()));

      const apy = (await MercadoSantaFeContract.getLoan(1)).apy;
      const grandDebt = calcGrandTotal(borrowAmount, apy, await MercadoSantaFeContract.fixedLoanFee());
      const payment = grandDebt/3n;
      await XOCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);

      // *** INSTALLMENT 0 *********************************

      await MercadoSantaFeContract.connect(alice).pay(payment, 1);
      expect(invariantTotalAssets).to.be.equal(await BodegaContract.totalAssets());
      expect(await MercadoSantaFeContract.totalDeployedInLoans()).to.be.equal(
        await MercadoSantaFeContract.getTotalDebt(borrowAmount, initialCollat) - payment
      );
      console.log("In WOS: ", await BodegaContract.totalInWOS());
      // console.log("totalAssets: ", ethers.formatEther(await BodegaContract.totalAssets()));
      // console.log("totalDeploy: ", ethers.formatEther(await MercadoSantaFeContract.totalDeployedInLoans()));

      // *** INSTALLMENT in the middle *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1); // moving to next installment

      await MercadoSantaFeContract.connect(alice).pay(payment, 1);
      expect(invariantTotalAssets).to.be.equal(await BodegaContract.totalAssets());
      expect(await MercadoSantaFeContract.totalDeployedInLoans()).to.be.equal(
        await MercadoSantaFeContract.getTotalDebt(borrowAmount, initialCollat) - (2n * payment)
      );
      await BodegaContract.flush();
      console.log("In WOS: ", await BodegaContract.totalInWOS());
      // console.log("totalAssets: ", ethers.formatEther(await BodegaContract.totalAssets()));
      // console.log("totalDeploy: ", ethers.formatEther(await MercadoSantaFeContract.totalDeployedInLoans()));

      // *** Last INSTALLMENT *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2); // moving to next installment

      await MercadoSantaFeContract.connect(alice).pay(
        await MercadoSantaFeContract.getUserDebt(alice.address),
        1
      );
      console.log("In WOS: ", await BodegaContract.totalInWOS());
      expect(invariantTotalAssets).to.be.equal(await BodegaContract.totalAssets());
      expect(await MercadoSantaFeContract.totalDeployedInLoans()).to.be.equal(0);
      // console.log("totalAssets: ", ethers.formatEther(await BodegaContract.totalAssets()));
      // console.log("totalDeploy: ", ethers.formatEther(await MercadoSantaFeContract.totalDeployedInLoans()));

      // *** AFTER Last INSTALLMENT *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3); // moving to next installment
    });

    // it("All payments lagging 1 installment.", async function () {
    //   const {
    //     MercadoSantaFeContract,
    //     BodegaContract,
    //     USDCTokenContract,
    //     XOCTokenContract,
    //     alice,
    //     bob,
    //   } = await loadFixture(deployProtocolFixture);

    //   const initialCollat = ethers.parseUnits("100", 6);

    //   /// Deposit liquidity.
    //   await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
    //   await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

    //   await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
    //   await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

    //   // const borrowAmount = await MercadoSantaFeContract.estimateLoanAmount(initialCollat, 6000);
    //   const borrowAmount = ethers.parseUnits("1000", 18); // mil pesitos 🦅
    //   // console.log(ethers.formatEther(borrowAmount));

    //   /// Create first loan.
    //   await MercadoSantaFeContract.connect(alice).borrow(
    //     [
    //       // uint256 amount;
    //       borrowAmount,
    //       // uint8 installments;
    //       3,
    //       // uint32 duration;
    //       DURATION_3_WEEK,
    //       // uint256 attachedCollateral;
    //       initialCollat
    //     ]
    //   );
    //   // console.log(await MercadoSantaFeContract.getLoan(1));
    //   // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

    //   const apy = (await MercadoSantaFeContract.getLoan(1)).apy;
    //   const grandDebt = calcGrandTotal(borrowAmount, apy, await MercadoSantaFeContract.fixedLoanFee());
    //   const payment = grandDebt/3n;
    //   await XOCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);

    //   // Allocate enough to pay for interests.
    //   await XOCTokenContract.allocateTo(alice.address, grandDebt - borrowAmount);
    //   // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(payment);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   // *** INSTALLMENT 0 *********************************

    //   // *** INSTALLMENT in the middle *********************************

    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
    //   await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1); // moving to next installment

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(payment);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(2n * payment);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   await MercadoSantaFeContract.connect(alice).pay(payment, 1);

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(payment);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt - payment);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   // *** Last INSTALLMENT *********************************

    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
    //   await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2); // moving to next installment

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(payment);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(await MercadoSantaFeContract.getUserDebt(alice.address));
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(await MercadoSantaFeContract.getUserDebt(alice.address));
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   await MercadoSantaFeContract.connect(alice).pay(payment, 1);

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(await MercadoSantaFeContract.getUserDebt(alice.address));
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(await MercadoSantaFeContract.getUserDebt(alice.address));
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   // *** AFTER Last INSTALLMENT *********************************

    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
    //   await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3); // moving to next installment

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(await MercadoSantaFeContract.getUserDebt(alice.address));
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(await MercadoSantaFeContract.getUserDebt(alice.address));
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(await MercadoSantaFeContract.getUserDebt(alice.address));
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3);

    //   await MercadoSantaFeContract.connect(alice).pay(
    //     await MercadoSantaFeContract.getUserDebt(alice.address),
    //     1
    //   );

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));
    // });

    // it("Single payment at installment 0.", async function () {
    //   const {
    //     MercadoSantaFeContract,
    //     BodegaContract,
    //     USDCTokenContract,
    //     XOCTokenContract,
    //     alice,
    //     bob,
    //   } = await loadFixture(deployProtocolFixture);

    //   const initialCollat = ethers.parseUnits("100", 6);

    //   /// Deposit liquidity.
    //   await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
    //   await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

    //   await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
    //   await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

    //   // const borrowAmount = await MercadoSantaFeContract.estimateLoanAmount(initialCollat, 6000);
    //   const borrowAmount = ethers.parseUnits("1000", 18); // mil pesitos 🦅
    //   // console.log(ethers.formatEther(borrowAmount));

    //   /// Create first loan.
    //   await MercadoSantaFeContract.connect(alice).borrow(
    //     [
    //       // uint256 amount;
    //       borrowAmount,
    //       // uint8 installments;
    //       3,
    //       // uint32 duration;
    //       DURATION_3_WEEK,
    //       // uint256 attachedCollateral;
    //       initialCollat
    //     ]
    //   );
    //   // console.log(await MercadoSantaFeContract.getLoan(1));
    //   // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

    //   const apy = (await MercadoSantaFeContract.getLoan(1)).apy;
    //   const grandDebt = calcGrandTotal(borrowAmount, apy, await MercadoSantaFeContract.fixedLoanFee());
    //   const payment = grandDebt/3n;
    //   await XOCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);

    //   // Allocate enough to pay for interests.
    //   await XOCTokenContract.allocateTo(alice.address, grandDebt - borrowAmount);
    //   // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(payment);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   // *** INSTALLMENT 0 *********************************

    //   await MercadoSantaFeContract.connect(alice).pay(grandDebt, 1);

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   // *** INSTALLMENT in the middle *********************************

    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
    //   await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1); // moving to next installment

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   // *** Last INSTALLMENT *********************************

    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
    //   await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2); // moving to next installment

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   // *** AFTER Last INSTALLMENT *********************************

    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
    //   await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3); // moving to next installment

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));
    // });

    // it("Single payment at installment 1.", async function () {
    //   const {
    //     MercadoSantaFeContract,
    //     BodegaContract,
    //     USDCTokenContract,
    //     XOCTokenContract,
    //     alice,
    //     bob,
    //   } = await loadFixture(deployProtocolFixture);

    //   const initialCollat = ethers.parseUnits("100", 6);

    //   /// Deposit liquidity.
    //   await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
    //   await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

    //   await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
    //   await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

    //   // const borrowAmount = await MercadoSantaFeContract.estimateLoanAmount(initialCollat, 6000);
    //   const borrowAmount = ethers.parseUnits("1000", 18); // mil pesitos 🦅
    //   // console.log(ethers.formatEther(borrowAmount));

    //   /// Create first loan.
    //   await MercadoSantaFeContract.connect(alice).borrow(
    //     [
    //       // uint256 amount;
    //       borrowAmount,
    //       // uint8 installments;
    //       3,
    //       // uint32 duration;
    //       DURATION_3_WEEK,
    //       // uint256 attachedCollateral;
    //       initialCollat
    //     ]
    //   );
    //   // console.log(await MercadoSantaFeContract.getLoan(1));
    //   // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

    //   const apy = (await MercadoSantaFeContract.getLoan(1)).apy;
    //   const grandDebt = calcGrandTotal(borrowAmount, apy, await MercadoSantaFeContract.fixedLoanFee());
    //   const payment = grandDebt/3n;
    //   await XOCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);

    //   // Allocate enough to pay for interests.
    //   await XOCTokenContract.allocateTo(alice.address, grandDebt - borrowAmount);
    //   // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(payment);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   // *** INSTALLMENT 0 *********************************

    //   // *** INSTALLMENT in the middle *********************************

    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
    //   await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1); // moving to next installment

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(payment);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(2n * payment);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   await MercadoSantaFeContract.connect(alice).pay(grandDebt, 1);

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   // *** Last INSTALLMENT *********************************

    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
    //   await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2); // moving to next installment

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   // *** AFTER Last INSTALLMENT *********************************

    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
    //   await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3); // moving to next installment

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));
    // });

    // it("Single payment at installment 2.", async function () {
    //   const {
    //     MercadoSantaFeContract,
    //     BodegaContract,
    //     USDCTokenContract,
    //     XOCTokenContract,
    //     alice,
    //     bob,
    //   } = await loadFixture(deployProtocolFixture);

    //   const initialCollat = ethers.parseUnits("100", 6);

    //   /// Deposit liquidity.
    //   await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
    //   await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

    //   await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
    //   await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

    //   // const borrowAmount = await MercadoSantaFeContract.estimateLoanAmount(initialCollat, 6000);
    //   const borrowAmount = ethers.parseUnits("1000", 18); // mil pesitos 🦅
    //   // console.log(ethers.formatEther(borrowAmount));

    //   /// Create first loan.
    //   await MercadoSantaFeContract.connect(alice).borrow(
    //     [
    //       // uint256 amount;
    //       borrowAmount,
    //       // uint8 installments;
    //       3,
    //       // uint32 duration;
    //       DURATION_3_WEEK,
    //       // uint256 attachedCollateral;
    //       initialCollat
    //     ]
    //   );
    //   // console.log(await MercadoSantaFeContract.getLoan(1));
    //   // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

    //   const apy = (await MercadoSantaFeContract.getLoan(1)).apy;
    //   const grandDebt = calcGrandTotal(borrowAmount, apy, await MercadoSantaFeContract.fixedLoanFee());
    //   const payment = grandDebt/3n;
    //   await XOCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);

    //   // Allocate enough to pay for interests.
    //   await XOCTokenContract.allocateTo(alice.address, grandDebt - borrowAmount);
    //   // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(payment);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   // *** INSTALLMENT 0 *********************************

    //   // *** INSTALLMENT in the middle *********************************

    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
    //   await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1); // moving to next installment

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(payment);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(2n * payment);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   // *** Last INSTALLMENT *********************************

    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
    //   await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2); // moving to next installment

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(2n * payment);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(grandDebt);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   await MercadoSantaFeContract.connect(alice).pay(grandDebt, 1);

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   // *** AFTER Last INSTALLMENT *********************************

    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
    //   await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3); // moving to next installment

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));
    // });

    // it("Single payment at installment 3 (late).", async function () {
    //   const {
    //     MercadoSantaFeContract,
    //     BodegaContract,
    //     USDCTokenContract,
    //     XOCTokenContract,
    //     alice,
    //     bob,
    //   } = await loadFixture(deployProtocolFixture);

    //   const initialCollat = ethers.parseUnits("100", 6);

    //   /// Deposit liquidity.
    //   await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
    //   await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

    //   await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
    //   await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

    //   // const borrowAmount = await MercadoSantaFeContract.estimateLoanAmount(initialCollat, 6000);
    //   const borrowAmount = ethers.parseUnits("1000", 18); // mil pesitos 🦅
    //   // console.log(ethers.formatEther(borrowAmount));

    //   /// Create first loan.
    //   await MercadoSantaFeContract.connect(alice).borrow(
    //     [
    //       // uint256 amount;
    //       borrowAmount,
    //       // uint8 installments;
    //       3,
    //       // uint32 duration;
    //       DURATION_3_WEEK,
    //       // uint256 attachedCollateral;
    //       initialCollat
    //     ]
    //   );
    //   // console.log(await MercadoSantaFeContract.getLoan(1));
    //   // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

    //   const apy = (await MercadoSantaFeContract.getLoan(1)).apy;
    //   const grandDebt = calcGrandTotal(borrowAmount, apy, await MercadoSantaFeContract.fixedLoanFee());
    //   const payment = grandDebt/3n;
    //   await XOCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);

    //   // Allocate enough to pay for interests.
    //   await XOCTokenContract.allocateTo(alice.address, grandDebt - borrowAmount);
    //   // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(payment);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   // *** INSTALLMENT 0 *********************************

    //   // *** INSTALLMENT in the middle *********************************

    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
    //   await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1); // moving to next installment

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(payment);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(2n * payment);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   // *** Last INSTALLMENT *********************************

    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
    //   await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2); // moving to next installment

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(2n * payment);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(grandDebt);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   // *** AFTER Last INSTALLMENT *********************************

    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
    //   await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3); // moving to next installment

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(grandDebt);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(grandDebt);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

    //   await MercadoSantaFeContract.connect(alice).pay(grandDebt, 1);

    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
    //   expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
    //   expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3);
    //   // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));
    // });
  });
});