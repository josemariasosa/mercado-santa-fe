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
      //   USDCTokenContract,
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
      // expect(await BorrowVerdeContract.collatAsset()).to.be.equal(USDCTokenContract.target);
      // expect(await BorrowVerdeContract.collatToUsdOracle()).to.be.equal(MPETHPriceFeedContract.target);
      // expect(await BorrowVerdeContract.treasuryVault()).to.be.equal(TreasuryVaultContract.target);
      // expect(await BorrowVerdeContract.minCollatAmount()).to.be.equal(ethers.parseEther("0.01"));

      // expect(await BorrowVerdeContract.safeLtvBp()).to.be.equal(5000);
      // expect(await BorrowVerdeContract.liquidationLtvBp()).to.be.equal(7000);
      // expect(await BorrowVerdeContract.liquidationPenaltyBp()).to.be.equal(500);
    });

    it("Initialization parameters are correct.", async function () {
      const {
        MercadoSantaFeContract,
        USDCTokenContract,
        BodegaContract,
        XOCTokenContract,
        owner,
        alice,
        bob,
        carl,
      } = await loadFixture(deployProtocolFixture);

      expect(await BodegaContract.totalAssets()).to.be.equal(0);

      // // const loan = {
      // //   owner: alice.address,
      // //   amount: ethers.parseUnits("1234", 18),
      // //   totalPayment: 0,
      // //   installments: 3,
      // //   apy: 800,
      // //   createdAt: await MercadoSantaFeContract.test__getNow(),
      // //   duration: 3 * 4 * 7 * 24 * 60 * 60, // aprox 3 months
      // //   attachedCollateral: ethers.parseUnits("500", 18),
      // // };

      // // await MercadoSantaFeContract.test__validateLoan(loan);

      // // console.log(loan);

      // // console.log(await MercadoSantaFeContract.test__loanDebt(loan));

      // let _status;
      // for (let i = 0; i < 3; i++) {
      //   if (i == 0) {
      //     // we shoud be in installment 0.
      //     expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
      //     _status = await MercadoSantaFeContract.test__loanDebt(loan);
      //     let maturedDebt =  _status.maturedDebt; // in pesos
      //     let nextInstallment = _status.nextInstallment; // in pesos
      //     let remainingDebt = _status[2];

      //     expect(maturedDebt).to.be.equal(0);
      //     expect(nextInstallment).to.be.equal() = _status.nextInstallment; // in pesos

      //     console.log("osito cup")
      //     console.log(maturedDebt)
      //     console.log(nextInstallment)
      //     console.log(remainingDebt)
      //     // expect(await MercadoSantaFeContract.test__loanDebt(loan)).to.be.equal(0);
      //   }
      // }


    });
  });

  describe("Validate loan creation", function () {
    // LessThanMinCollatAmount
    // CollateralBellowMaxLtv
    // ApyGreaterThanLimit
    // ApyGreaterThanAccepted
    // NotEnoughLiquidity
    // InvalidLoanAmount
    // InvalidLoanInstallments
    // InvalidIntervalDuration
    // InvalidLoanDuration
    it("NotEnoughCollateral.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        owner,
        alice,
        bob,
        carl,
      } = await loadFixture(deployProtocolFixture);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, ethers.parseUnits("100", 6));

      /// Create first loan.
      await MercadoSantaFeContract.connect(alice).borrow(
        [
          // uint256 amount;
          ethers.parseUnits("1234", 18),
          // uint8 installments;
          3,
          // uint16 apy;
          800,
          // uint32 duration;
          3 * 4 * 7 * 24 * 60 * 60, // approx 3 months
          // uint256 attachedCollateral;
          ethers.parseUnits("0.5", 18)
        ]
      );
    });

    // it("[REFERENCE 🙊] Initialization parameters are correct.", async function () {
    //   const {
    //     MercadoSantaFeContract,
    //     BodegaContract,
    //     USDCTokenContract,
    //     XOCTokenContract,
    //     owner,
    //     alice,
    //     bob,
    //     carl,
    //   } = await loadFixture(deployProtocolFixture);

    //   /// Deposit liquidity.
    //   await XOCTokenContract.connect(alice).approve(BodegaContract.target, MLARGE);
    //   await BodegaContract.connect(alice).deposit(ethers.parseUnits("31000", 18), alice.address);

    //   await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
    //   await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, ethers.parseEther("1"));

    //   /// Create first loan.
    //   await MercadoSantaFeContract.connect(alice).borrow(
    //     [
    //       // uint256 amount;
    //       ethers.parseUnits("1234", 18),
    //       // uint8 installments;
    //       3,
    //       // uint16 apy;
    //       800,
    //       // uint32 duration;
    //       3 * 4 * 7 * 24 * 60 * 60, // approx 3 months
    //       // uint256 attachedCollateral;
    //       ethers.parseUnits("0.5", 18)
    //     ]
    //   );
    // });

  });

  describe("Getting my first loan", function () {
    it("Loan parameters must be correct.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        owner,
        alice,
        bob,
        carl,
      } = await loadFixture(deployProtocolFixture);

      /// Deposit liquidity.
      await XOCTokenContract.connect(alice).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(alice).deposit(ethers.parseUnits("31000", 18), alice.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, ethers.parseEther("1"));

      /// Create first loan.
      await MercadoSantaFeContract.connect(alice).borrow(
        [
          // uint256 amount;
          ethers.parseUnits("1234", 18),
          // uint8 installments;
          3,
          // uint16 apy;
          800,
          // uint32 duration;
          3 * 4 * 7 * 24 * 60 * 60, // approx 3 months
          // uint256 attachedCollateral;
          ethers.parseUnits("0.5", 18)
        ]
      );

      expect(
        await MercadoSantaFeContract.loanPrincipal()
      ).to.be.equal(ethers.parseUnits("1234", 18));



      let _status;
      for (let i = 0; i < 3; i++) {
        if (i == 0) { // we shoud be in installment 0.
          console.log("TIMESTAMP NOW: ", i, await MercadoSantaFeContract.test__getNow());
          expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
          _status = await MercadoSantaFeContract.getLoanDebtStatus(1);
          let maturedDebt =  _status.maturedDebt; // in pesos
          let nextInstallment = _status.nextInstallment; // in pesos
          let remainingDebt = _status[2];

          expect(maturedDebt).to.be.equal(0);
          console.log(await MercadoSantaFeContract.getLoan(1));
          expect(
            await MercadoSantaFeContract.getUserDebt(alice.address)
          ).to.be.within((3n * nextInstallment) - 1n, (3n * nextInstallment) + 1n);
          // expect(nextInstallment).to.be.equal() = _status.nextInstallment; // in pesos
          expect(
            await MercadoSantaFeContract.getUserDebt(alice.address)
          ).to.be.equal(remainingDebt);

          console.log("osito cup")
          console.log(maturedDebt)
          console.log(nextInstallment)
          console.log(remainingDebt)
          // expect(await MercadoSantaFeContract.test__loanDebt(loan)).to.be.equal(0);
        } else if (i == 1) { // we shoud be in installment 1.
          console.log("TIMESTAMP NOW: ", i, await MercadoSantaFeContract.test__getNow());
          expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);


        } else if (i == 2) {

          expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
        }

        console.log(await MercadoSantaFeContract.getIntervalDuration(1));
        await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      }


      // for (i = 0; i < 100; i++) {
      //   await time.increase(ONE_DAY_IN_SECS_PLUS);
      //   await BorrowVerdeContract.accrue();
      // }

      // expect(await BorrowVerdeContract.owner()).to.be.equal(owner.address);
      // expect(await BorrowVerdeContract.verdeToken()).to.be.equal(VerdeTokenContract.target);
      // expect(await BorrowVerdeContract.collatAsset()).to.be.equal(USDCTokenContract.target);
      // expect(await BorrowVerdeContract.collatToUsdOracle()).to.be.equal(MPETHPriceFeedContract.target);
      // expect(await BorrowVerdeContract.treasuryVault()).to.be.equal(TreasuryVaultContract.target);
      // expect(await BorrowVerdeContract.minCollatAmount()).to.be.equal(ethers.parseEther("0.01"));

      // expect(await BorrowVerdeContract.safeLtvBp()).to.be.equal(5000);
      // expect(await BorrowVerdeContract.liquidationLtvBp()).to.be.equal(7000);
      // expect(await BorrowVerdeContract.liquidationPenaltyBp()).to.be.equal(500);
    });

    it("Invalid basis points limits MUST revert.", async function () {
      // const {
      //   MercadoSantaFeContract,
      //   USDCTokenContract,
      //   XOCTokenContract,
      //   owner,
      //   alice,
      //   bob,
      //   carl,
      // } = await loadFixture(deployProtocolFixture);

      // // const loan = {
      // //   owner: alice.address,
      // //   amount: ethers.parseUnits("1234", 18),
      // //   totalPayment: 0,
      // //   installments: 3,
      // //   apy: 800,
      // //   createdAt: await MercadoSantaFeContract.test__getNow(),
      // //   duration: 3 * 4 * 7 * 24 * 60 * 60, // aprox 3 months
      // //   attachedCollateral: ethers.parseUnits("500", 18),
      // // };

      // // await MercadoSantaFeContract.test__validateLoan(loan);

      // // console.log(loan);

      // // console.log(await MercadoSantaFeContract.test__loanDebt(loan));

      // let _status;
      // for (let i = 0; i < 3; i++) {
      //   if (i == 0) {
      //     // we shoud be in installment 0.
      //     expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
      //     _status = await MercadoSantaFeContract.test__loanDebt(loan);
      //     let maturedDebt =  _status.maturedDebt; // in pesos
      //     let nextInstallment = _status.nextInstallment; // in pesos
      //     let remainingDebt = _status[2];

      //     expect(maturedDebt).to.be.equal(0);
      //     expect(nextInstallment).to.be.equal() = _status.nextInstallment; // in pesos

      //     console.log("osito cup")
      //     console.log(maturedDebt)
      //     console.log(nextInstallment)
      //     console.log(remainingDebt)
      //     // expect(await MercadoSantaFeContract.test__loanDebt(loan)).to.be.equal(0);
      //   }
      // }


    });
  });
});