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

    it("Validate deployed APY.", async function () {
      const {
        MercadoSantaFeContract,
      } = await loadFixture(deployProtocolFixture);

      const MercadoSantaFe = await ethers.getContractFactory("MercadoSantaFeHarness");
      const BodegaDeChocolates = await ethers.getContractFactory("BodegaDeChocolates");
      const USDCToken = await ethers.getContractFactory("USDCToken");
      const WETHToken = await ethers.getContractFactory("WETHToken");
      const ETHToUSDOracle = await ethers.getContractFactory("ETHToUSDOracle");

      const [owner] = await ethers.getSigners();

      /// Deploying dummy tokens.

      const USDCTokenContract = await USDCToken.deploy();
      await USDCTokenContract.waitForDeployment();

      const WETHTokenContract = await WETHToken.deploy();
      await WETHTokenContract.waitForDeployment();

      const ETHToUSDOracleContract = await ETHToUSDOracle.deploy();
      await ETHToUSDOracleContract.waitForDeployment();

      /// Deploying markets.

      const BodegaContract = await BodegaDeChocolates.deploy(USDCTokenContract.target, owner.address);
      await BodegaContract.waitForDeployment();

      await expect(MercadoSantaFe.deploy(
        WETHTokenContract.target,
        BodegaContract.target,
        ETHToUSDOracleContract.target,
        ethers.parseEther("0.01"),
        ethers.parseUnits("10000", 18),
        ethers.parseUnits("100", 18),
        ethers.parseUnits("10", 18),
        (await MercadoSantaFeContract.MIN_BASE_APY_BP()) - 1n,
        3200,
        1500,
      )).to.be.revertedWithCustomError(MercadoSantaFe, "InvalidAPY");

      await expect(MercadoSantaFe.deploy(
        WETHTokenContract.target,
        BodegaContract.target,
        ETHToUSDOracleContract.target,
        ethers.parseEther("0.01"),
        ethers.parseUnits("10000", 18),
        ethers.parseUnits("100", 18),
        ethers.parseUnits("10", 18),
        800,
        (await MercadoSantaFeContract.MAX_COMBINED_APY_BP()),
        1500,
      )).to.be.revertedWithCustomError(MercadoSantaFe, "InvalidAPY");
    });
  });

  describe("Calculate APY", function () {
    it("Correct calculations.", async function () {
      const {
        MercadoSantaFeContract,
      } = await loadFixture(deployProtocolFixture);

      expect(
        await MercadoSantaFeContract.calculateAPY(1000)
      ).to.be.equal(await MercadoSantaFeContract.baseApyBp());

      let lastApy = await MercadoSantaFeContract.baseApyBp();
      const maxLtv = await MercadoSantaFeContract.MAX_LTV_BP();
      let allRun = false;
      for (let ltv = 1000; ltv <= maxLtv; ltv += 100) {
        // exponential chart of APY. 📈
        // console.log(ltv, await MercadoSantaFeContract.calculateAPY(ltv));
        if (ltv <= (await MercadoSantaFeContract.SAFE_LTV_BP())) {
          expect(
            await MercadoSantaFeContract.calculateAPY(ltv)
          ).to.be.equal(await MercadoSantaFeContract.baseApyBp());

        } else if (ltv < (await MercadoSantaFeContract.MAX_LTV_BP())) {
          expect(
            await MercadoSantaFeContract.calculateAPY(ltv)
          ).to.be.greaterThan(lastApy);
            lastApy = await MercadoSantaFeContract.calculateAPY(ltv);

        } else {
          allRun = true;
          expect(
            await MercadoSantaFeContract.calculateAPY(ltv)
          ).to.be.greaterThan(lastApy);
          expect(
            await MercadoSantaFeContract.calculateAPY(ltv)
          ).to.be.equal(
            (await MercadoSantaFeContract.baseApyBp())
            + (await MercadoSantaFeContract.maxAdditionalApyBp())
          );
        }
      }
      expect(allRun).to.be.true;
    });
  });

  describe("Exchange rates", function () {
    it("[USDC(6) -> MXN(18)] fromCollatToPesos().", async function () {
      const {
        MercadoSantaFeContract,
        USDToMXNOracleContract,
      } = await loadFixture(deployProtocolFixture);

      /// IMPORTANT: collat has 6 decimals and Pesos has 18

      const usdPrice = (await USDToMXNOracleContract.latestRoundData())[1];

      // console.log("usdPrice", usdPrice);
      // console.log(ethers.formatUnits(usdPrice, 8));

      // console.log(ethers.formatUnits(
      //   await MercadoSantaFeContract.test__fromCollatToPesos(ethers.parseUnits("50", 6)),
      //   18)
      // );

      const expectedAmount = ((50n * usdPrice) / 100n) * BigInt(1E12); // usdPrice has 8 decimals.

      // console.log(expectedAmount);
      expect(await MercadoSantaFeContract.test__fromCollatToPesos(ethers.parseUnits("50", 6))).to.be.equal(expectedAmount);
    });

    it("[USDC(6) -> MXN(18)] fromPesosToCollat().", async function () {
      const {
        MercadoSantaFeContract,
        USDToMXNOracleContract,
      } = await loadFixture(deployProtocolFixture);

      /// IMPORTANT: collat has 6 decimals and Pesos has 18

      const usdPrice = (await USDToMXNOracleContract.latestRoundData())[1];

      // console.log("usdPrice", usdPrice);
      // console.log(ethers.formatUnits(usdPrice, 8));

      // console.log(ethers.formatUnits(
      //   await MercadoSantaFeContract.test__fromPesosToCollat(ethers.parseUnits("2000", 18)),
      //   6)
      // );

      // // const expectedAmount = ((2000n / usdPrice) / 100n) * BigInt(1E12); // usdPrice has 8 decimals.
      const expectedAmount = ((2000n * BigInt(1E14)) / usdPrice); // usdPrice has 8 decimals.

      // console.log(expectedAmount);
      // console.log(ethers.formatUnits(expectedAmount, 6));
      expect(await MercadoSantaFeContract.test__fromPesosToCollat(ethers.parseUnits("2000", 18))).to.be.equal(expectedAmount);
    });

    it("[WETH(18) -> USD(6)] fromCollatToPesos().", async function () {
      const MercadoSantaFe = await ethers.getContractFactory("MercadoSantaFeHarness");
      const BodegaDeChocolates = await ethers.getContractFactory("BodegaDeChocolates");
      const USDCToken = await ethers.getContractFactory("USDCToken");
      const WETHToken = await ethers.getContractFactory("WETHToken");
      const ETHToUSDOracle = await ethers.getContractFactory("ETHToUSDOracle");

      const [owner] = await ethers.getSigners();

      /// Deploying dummy tokens.

      const USDCTokenContract = await USDCToken.deploy();
      await USDCTokenContract.waitForDeployment();

      const WETHTokenContract = await WETHToken.deploy();
      await WETHTokenContract.waitForDeployment();

      const ETHToUSDOracleContract = await ETHToUSDOracle.deploy();
      await ETHToUSDOracleContract.waitForDeployment();

      /// Deploying markets.

      const BodegaContract = await BodegaDeChocolates.deploy(USDCTokenContract.target, owner.address);
      await BodegaContract.waitForDeployment();

      const MercadoSantaFeContract = await MercadoSantaFe.deploy(
        WETHTokenContract.target,
        BodegaContract.target,
        ETHToUSDOracleContract.target,
        ethers.parseEther("0.01"),
        ethers.parseUnits("10000", 18),
        ethers.parseUnits("100", 18),
        ethers.parseUnits("10", 18),
        800,
        3200,
        1500,
      );
      await MercadoSantaFeContract.waitForDeployment();

      const ethPrice = (await ETHToUSDOracleContract.latestRoundData())[1];

      // console.log("ethPrice", ethPrice);
      // console.log(ethers.formatUnits(ethPrice, 8));

      // console.log(ethers.formatUnits(
      //   await MercadoSantaFeContract.test__fromCollatToPesos(ethers.parseEther("10")),
      //   6)
      // );

      const expectedAmount = ((10n * ethPrice) / 100n);

      // console.log(expectedAmount);
      expect(await MercadoSantaFeContract.test__fromCollatToPesos(ethers.parseEther("10"))).to.be.equal(expectedAmount);
    });

    it("[WETH(18) -> USD(6)] fromPesosToCollat().", async function () {
      const MercadoSantaFe = await ethers.getContractFactory("MercadoSantaFeHarness");
      const BodegaDeChocolates = await ethers.getContractFactory("BodegaDeChocolates");
      const USDCToken = await ethers.getContractFactory("USDCToken");
      const WETHToken = await ethers.getContractFactory("WETHToken");
      const ETHToUSDOracle = await ethers.getContractFactory("ETHToUSDOracle");

      const [owner] = await ethers.getSigners();

      /// Deploying dummy tokens.

      const USDCTokenContract = await USDCToken.deploy();
      await USDCTokenContract.waitForDeployment();

      const WETHTokenContract = await WETHToken.deploy();
      await WETHTokenContract.waitForDeployment();

      const ETHToUSDOracleContract = await ETHToUSDOracle.deploy();
      await ETHToUSDOracleContract.waitForDeployment();

      /// Deploying markets.

      const BodegaContract = await BodegaDeChocolates.deploy(USDCTokenContract.target, owner.address);
      await BodegaContract.waitForDeployment();

      const MercadoSantaFeContract = await MercadoSantaFe.deploy(
        WETHTokenContract.target,
        BodegaContract.target,
        ETHToUSDOracleContract.target,
        ethers.parseEther("0.01"),
        ethers.parseUnits("10000", 18),
        ethers.parseUnits("100", 18),
        ethers.parseUnits("10", 18),
        800,
        3200,
        1500,
      );
      await MercadoSantaFeContract.waitForDeployment();

      const ethPrice = (await ETHToUSDOracleContract.latestRoundData())[1];

      // console.log("ethPrice", ethPrice);
      // console.log(ethers.formatUnits(ethPrice, 8));

      // console.log("la buena: ");
      // console.log(ethers.formatUnits(
      //   await MercadoSantaFeContract.test__fromPesosToCollat(ethers.parseUnits("2000", 6)),
      //   18)
      // );

      // // const expectedAmount = ((2000n / usdPrice) / 100n) * BigInt(1E12); // usdPrice has 8 decimals.
      const expectedAmount = ((2000n * BigInt(1E26)) / ethPrice); // usdPrice has 8 decimals.

      // console.log(expectedAmount);
      // console.log(ethers.formatEther(expectedAmount));
      expect(
        await MercadoSantaFeContract.test__fromPesosToCollat(ethers.parseUnits("2000", 6))
      ).to.be.within(expectedAmount-100n, expectedAmount+100n); // +-100 wei
    });

    it("[ETH(18) -> MXN(18)] fromCollatToPesos().", async function () {
      const MercadoSantaFe = await ethers.getContractFactory("MercadoSantaFeHarness");
      const BodegaDeChocolates = await ethers.getContractFactory("BodegaDeChocolates");
      const XOCToken = await ethers.getContractFactory("XOCToken");
      const WETHToken = await ethers.getContractFactory("WETHToken");
      const ETHToMXNOracle = await ethers.getContractFactory("ETHToMXNOracle");

      const [owner] = await ethers.getSigners();

      /// Deploying dummy tokens.

      const XOCTokenContract = await XOCToken.deploy();
      await XOCTokenContract.waitForDeployment();

      const WETHTokenContract = await WETHToken.deploy();
      await WETHTokenContract.waitForDeployment();

      const ETHToMXNOracleContract = await ETHToMXNOracle.deploy();
      await ETHToMXNOracleContract.waitForDeployment();

      /// Deploying markets.

      const BodegaContract = await BodegaDeChocolates.deploy(XOCTokenContract.target, owner.address);
      await BodegaContract.waitForDeployment();

      const MercadoSantaFeContract = await MercadoSantaFe.deploy(
        WETHTokenContract.target,
        BodegaContract.target,
        ETHToMXNOracleContract.target,
        ethers.parseEther("0.01"),
        ethers.parseUnits("10000", 18),
        ethers.parseUnits("100", 18),
        ethers.parseUnits("10", 18),
        800,
        3200,
        1500,
      );
      await MercadoSantaFeContract.waitForDeployment();

      const ethPrice = (await ETHToMXNOracleContract.latestRoundData())[1];

      // console.log("ethPrice", ethPrice);
      // console.log(ethers.formatUnits(ethPrice, 8));

      // console.log(ethers.formatUnits(
      //   await MercadoSantaFeContract.test__fromCollatToPesos(ethers.parseEther("10")),
      //   18)
      // );

      // const expectedAmount = ((2000n * BigInt(1E14)) / usdPrice); // usdPrice has 8 decimals.
      const expectedAmount = ((10n * ethPrice * BigInt(1E12)) / 100n);

      // console.log(expectedAmount);
      expect(await MercadoSantaFeContract.test__fromCollatToPesos(ethers.parseEther("10"))).to.be.equal(expectedAmount);
    });

    it("[ETH(18) -> MXN(18)] fromPesosToCollat().", async function () {
      const MercadoSantaFe = await ethers.getContractFactory("MercadoSantaFeHarness");
      const BodegaDeChocolates = await ethers.getContractFactory("BodegaDeChocolates");
      const XOCToken = await ethers.getContractFactory("XOCToken");
      const WETHToken = await ethers.getContractFactory("WETHToken");
      const ETHToMXNOracle = await ethers.getContractFactory("ETHToMXNOracle");

      const [owner] = await ethers.getSigners();

      /// Deploying dummy tokens.

      const XOCTokenContract = await XOCToken.deploy();
      await XOCTokenContract.waitForDeployment();

      const WETHTokenContract = await WETHToken.deploy();
      await WETHTokenContract.waitForDeployment();

      const ETHToMXNOracleContract = await ETHToMXNOracle.deploy();
      await ETHToMXNOracleContract.waitForDeployment();

      /// Deploying markets.

      const BodegaContract = await BodegaDeChocolates.deploy(XOCTokenContract.target, owner.address);
      await BodegaContract.waitForDeployment();

      const MercadoSantaFeContract = await MercadoSantaFe.deploy(
        WETHTokenContract.target,
        BodegaContract.target,
        ETHToMXNOracleContract.target,
        ethers.parseEther("0.01"),
        ethers.parseUnits("10000", 18),
        ethers.parseUnits("100", 18),
        ethers.parseUnits("10", 18),
        800,
        3200,
        1500,
      );
      await MercadoSantaFeContract.waitForDeployment();

      const ethPrice = (await ETHToMXNOracleContract.latestRoundData())[1];

      // console.log("ethPrice", ethPrice);
      // console.log(ethers.formatUnits(ethPrice, 8));

      // console.log("la buena: ");
      // console.log(ethers.formatUnits(
      //   await MercadoSantaFeContract.test__fromPesosToCollat(ethers.parseUnits("2000", 18)),
      //   18)
      // );

      // const expectedAmount = ((2000n / usdPrice) / 100n) * BigInt(1E12); // usdPrice has 8 decimals.
      const expectedAmount = ((2000n * BigInt(1E26)) / ethPrice); // usdPrice has 8 decimals.

      // console.log(expectedAmount);
      // console.log(ethers.formatEther(expectedAmount));
      expect(
        await MercadoSantaFeContract.test__fromPesosToCollat(ethers.parseUnits("2000", 18))
      ).to.be.within(expectedAmount-100n, expectedAmount+100n); // +-100 wei
    });
  });

  describe("Validate loan creation", function () {
    it("NotEnoughCollatToBorrow.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = ethers.parseUnits("100", 6);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);
      expect(await MercadoSantaFeContract.getUserCollat(alice.address)).to.be.equal(initialCollat);

      const borrowAmount = await MercadoSantaFeContract.estimateLoanAmount(initialCollat, 6000);
      // console.log(ethers.formatEther(borrowAmount));

      /// Create first loan.
      await expect(
        MercadoSantaFeContract.connect(alice).borrow(
          [
            // uint256 amount;
            borrowAmount,
            // uint8 installments;
            3,
            // uint32 duration;
            DURATION_3_MONTHS,
            // uint256 attachedCollateral;
            ethers.parseUnits("101", 6)
          ]
        )
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "NotEnoughCollatToBorrow");
    });

    it("LessThanMinCollatAmount.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = await MercadoSantaFeContract.minCollateralAmount();
      // console.log(initialCollat);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await expect(
        MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat - 1n)
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "LessThanMinCollatAmount");

      const borrowAmount = await MercadoSantaFeContract.estimateLoanAmount(initialCollat, 6000);
      // // console.log(ethers.formatEther(borrowAmount));

      /// Create first loan.
      await expect(
        MercadoSantaFeContract.connect(alice).depositAndBorrow(
          [
            // uint256 amount;
            borrowAmount,
            // uint8 installments;
            3,
            // uint32 duration;
            DURATION_3_MONTHS,
            // uint256 attachedCollateral;
            initialCollat - 1n
          ]
        )
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "LessThanMinCollatAmount");
    });

    it("ExceedingMaxLTV.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = ethers.parseUnits("100", 6);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);
      expect(await MercadoSantaFeContract.getUserCollat(alice.address)).to.be.equal(initialCollat);

      // console.log(ethers.formatEther(borrowAmount));
      expect(MercadoSantaFeContract.calculateAPY(
        await MercadoSantaFeContract.estimateLoanAmount(initialCollat, 10000),
        DURATION_3_MONTHS, initialCollat
      )).to.be.revertedWithCustomError(MercadoSantaFeContract, "ExceedingMaxLTV");

      /// Create first loan.
      await expect(
        MercadoSantaFeContract.connect(alice).borrow(
          [
            // uint256 amount;
            await MercadoSantaFeContract.estimateLoanAmount(initialCollat, 10000),
            // uint8 installments;
            3,
            // uint32 duration;
            DURATION_3_MONTHS,
            // uint256 attachedCollateral;
            initialCollat
          ]
        )
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "ExceedingMaxLTV");
    });

    it("CollatLessThanAmount.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = ethers.parseUnits("20", 6);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

      expect(MercadoSantaFeContract.calculateAPY(
        await MercadoSantaFeContract.estimateLoanAmount(initialCollat, 10000),
        DURATION_3_MONTHS, initialCollat
      )).to.be.revertedWithCustomError(MercadoSantaFeContract, "CollatLessThanAmount");
    });

    it("DoNotLeaveDust.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = ethers.parseUnits("100", 6);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

      await expect(MercadoSantaFeContract.connect(alice).withdrawCollateral(
        initialCollat - (await MercadoSantaFeContract.minCollateralAmount()) + 1n
      )).to.be.revertedWithCustomError(MercadoSantaFeContract, "DoNotLeaveDust");
    });

    it("InvalidBasisPoint.", async function () {
      const {
        MercadoSantaFeContract,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = ethers.parseUnits("100", 6);
      await expect(
        MercadoSantaFeContract.estimateLoanAmount(initialCollat, 10001)
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "InvalidBasisPoint");

      const amount = ethers.parseUnits("100", 18);
      await expect(
        MercadoSantaFeContract.estimateLoanCollat(amount, 10001)
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "InvalidBasisPoint");
    });

    it("InvalidInput && LoanDoesNotExist.", async function () {
      const {
        MercadoSantaFeContract,
      } = await loadFixture(deployProtocolFixture);

      await expect(
        MercadoSantaFeContract.getIntervalDuration(0)
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "LoanDoesNotExist");

      await expect(
        MercadoSantaFeContract.getInstallment(0)
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "LoanDoesNotExist");

      await expect(
        MercadoSantaFeContract.getLoanDebtStatus(0)
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "LoanDoesNotExist");

      await expect(
        MercadoSantaFeContract.getLoan(0)
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "LoanDoesNotExist");

      await expect(
        MercadoSantaFeContract.calculateAPY(0)
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "InvalidInput");

      await expect(
        MercadoSantaFeContract.calculateAPY((await MercadoSantaFeContract.MAX_LTV_BP()) + 1n)
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "ExceedingMaxLTV");

      await expect(
        MercadoSantaFeContract.depositCollateral(ethers.ZeroAddress, 1)
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "InvalidInput");

      await expect(
        MercadoSantaFeContract.withdrawCollateral(0)
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "InvalidInput");

      await expect(
        MercadoSantaFeContract.pay(1, 0)
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "LoanDoesNotExist");
    });

    it("InvalidIntervalDuration.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = ethers.parseUnits("100", 6);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

      const borrowAmount = await MercadoSantaFeContract.estimateLoanAmount(initialCollat, 6000);

      /// Create first loan.
      await expect(
        MercadoSantaFeContract.connect(alice).borrow(
          [
            // uint256 amount;
            borrowAmount,
            // uint8 installments;
            3,
            // uint32 duration;
            DURATION_3_DAY - 3,
            // uint256 attachedCollateral;
            initialCollat
          ]
        )
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "InvalidIntervalDuration");

      /// Create first loan.
      await expect(
        MercadoSantaFeContract.connect(alice).borrow(
          [
            // uint256 amount;
            borrowAmount,
            // uint8 installments;
            3,
            // uint32 duration;
            DURATION_3_MONTHS + 3,
            // uint256 attachedCollateral;
            initialCollat
          ]
        )
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "InvalidIntervalDuration");
    });

    it("InvalidLoanAmount.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = ethers.parseUnits("1000", 6);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

      /// Create first loan.
      await expect(
        MercadoSantaFeContract.connect(alice).borrow(
          [
            // uint256 amount;
            (await MercadoSantaFeContract.maxCreditAmount()) + 1n,
            // uint8 installments;
            3,
            // uint32 duration;
            DURATION_3_MONTHS,
            // uint256 attachedCollateral;
            initialCollat
          ]
        )
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "InvalidLoanAmount");

      /// Create first loan.
      await expect(
        MercadoSantaFeContract.connect(alice).borrow(
          [
            // uint256 amount;
            (await MercadoSantaFeContract.minCreditAmount()) - 1n,
            // uint8 installments;
            3,
            // uint32 duration;
            DURATION_3_MONTHS,
            // uint256 attachedCollateral;
            initialCollat
          ]
        )
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "InvalidLoanAmount");
    });

    it("InvalidLoanDuration.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = ethers.parseUnits("1000", 6);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

      /// Create first loan.
      await expect(
        MercadoSantaFeContract.connect(alice).borrow(
          [
            // uint256 amount;
            ethers.parseUnits("10000", 18),
            // uint8 installments;
            52,
            // uint32 duration;
            DURATION_1_YEAR + 1,
            // uint256 attachedCollateral;
            initialCollat
          ]
        )
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "InvalidLoanDuration");

      /// Create first loan.
      await expect(
        MercadoSantaFeContract.connect(alice).borrow(
          [
            // uint256 amount;
            ethers.parseUnits("1000", 18),
            // uint8 installments;
            3,
            // uint32 duration;
            DURATION_1_WEEK - 1,
            // uint256 attachedCollateral;
            initialCollat
          ]
        )
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "InvalidLoanDuration");
    });

    it("InvalidLoanInstallments.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = ethers.parseUnits("1000", 6);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

      /// Create first loan.
      await expect(
        MercadoSantaFeContract.connect(alice).borrow(
          [
            // uint256 amount;
            ethers.parseUnits("10000", 18),
            // uint8 installments;
            52 + 1,
            // uint32 duration;
            DURATION_1_YEAR + 1,
            // uint256 attachedCollateral;
            initialCollat
          ]
        )
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "InvalidLoanInstallments");

      /// Create first loan.
      await expect(
        MercadoSantaFeContract.connect(alice).borrow(
          [
            // uint256 amount;
            ethers.parseUnits("1000", 18),
            // uint8 installments;
            1,
            // uint32 duration;
            DURATION_1_WEEK - 1,
            // uint256 attachedCollateral;
            initialCollat
          ]
        )
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "InvalidLoanInstallments");
    });

    it("LoanIsFullyPaid && PayOnlyWhatYouOwn.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = ethers.parseUnits("300", 6);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

      const borrowAmount = await MercadoSantaFeContract.estimateLoanAmount(initialCollat, 6000);

      // console.log(ethers.formatUnits(initialCollat, 6));
      // console.log(ethers.formatUnits(borrowAmount, 18));

      /// Create first loan.
      await MercadoSantaFeContract.connect(alice).borrow(
        [
          // uint256 amount;
          borrowAmount,
          // uint8 installments;
          52,
          // uint32 duration;
          DURATION_1_YEAR,
          // uint256 attachedCollateral;
          initialCollat
        ]
      );

      const grandDebt = (await MercadoSantaFeContract.getLoanDebtStatus(1))[2];
      await XOCTokenContract.allocateTo(alice.address,
        grandDebt - (await XOCTokenContract.balanceOf(alice.address)) + 1n
      );

      const nextDue = (await MercadoSantaFeContract.getLoanDebtStatus(1))[1];
      await XOCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);

      /// partial first payment.
      const firstPayment = nextDue / 3n;
      const secondPayment = nextDue - firstPayment;

      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(nextDue);
      await MercadoSantaFeContract.connect(alice).pay(firstPayment, 1);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(secondPayment);
      // console.log("*******************************");
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));
      await MercadoSantaFeContract.connect(alice).pay(secondPayment, 1);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
      // console.log("*******************************");
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      const remainingDebt = (await MercadoSantaFeContract.getLoanDebtStatus(1))[2];
      await expect(
        MercadoSantaFeContract.connect(alice).pay(remainingDebt + 1n, 1)
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "PayOnlyWhatYouOwn");
    });

    it("MaxLoansByUser.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = ethers.parseUnits("800", 6);
      const individualCollat = ethers.parseUnits("200", 6);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

      const borrowAmount = await MercadoSantaFeContract.estimateLoanAmount(individualCollat, 6000);

      for (let i = 0; i < (await MercadoSantaFeContract.getMaxLoansPerUser()); i++) {
        await MercadoSantaFeContract.connect(alice).borrow(
          [
            // uint256 amount;
            borrowAmount,
            // uint8 installments;
            52,
            // uint32 duration;
            DURATION_1_YEAR,
            // uint256 attachedCollateral;
            individualCollat
          ]
        );
        let apy = (await MercadoSantaFeContract.getLoan(i+1)).apy;
        expect(await MercadoSantaFeContract.getUserDebt(alice.address)).to.be.equal(
          (1n + BigInt(i)) * calcGrandTotal(borrowAmount, apy, await MercadoSantaFeContract.fixedLoanFee())
        );
      }

      await expect(
        MercadoSantaFeContract.connect(alice).borrow(
          [
            // uint256 amount;
            borrowAmount,
            // uint8 installments;
            52,
            // uint32 duration;
            DURATION_1_YEAR,
            // uint256 attachedCollateral;
            individualCollat
          ]
        )
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "MaxLoansByUser");
    });

    it("NotEnoughBalance.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = ethers.parseUnits("800", 6);
      const individualCollat = ethers.parseUnits("200", 6);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

      const borrowAmount = await MercadoSantaFeContract.estimateLoanAmount(individualCollat, 6000);

      expect(await MercadoSantaFeContract.getUserCollat(alice.address)).to.be.equal(initialCollat);
      await MercadoSantaFeContract.connect(alice).borrow(
        [
          // uint256 amount;
          borrowAmount,
          // uint8 installments;
          52,
          // uint32 duration;
          DURATION_1_YEAR,
          // uint256 attachedCollateral;
          individualCollat
        ]
      );
      expect(
        await MercadoSantaFeContract.getUserCollat(alice.address)
      ).to.be.equal(initialCollat - individualCollat);

      await expect(
        MercadoSantaFeContract.connect(alice).withdrawCollateral(initialCollat - individualCollat + 1n)
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "NotEnoughBalance");
      const initialBalance = await USDCTokenContract.balanceOf(alice.address);
      await MercadoSantaFeContract.connect(alice).withdrawCollateral(initialCollat - individualCollat)
      expect(await USDCTokenContract.balanceOf(alice.address)).to.be.equal(
        initialBalance + initialCollat - individualCollat
      );
      await expect(
        MercadoSantaFeContract.connect(alice).withdrawAll()
      ).to.be.revertedWithCustomError(MercadoSantaFeContract, "NotEnoughBalance");
    });

    it("NotEnoughLiquidity.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = ethers.parseUnits("200", 6);
      const liquidity = ethers.parseUnits("2000", 18);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(liquidity, bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

      expect(await MercadoSantaFeContract.getUserCollat(alice.address)).to.be.equal(initialCollat);
      await expect(MercadoSantaFeContract.connect(alice).borrow(
        [
          // uint256 amount;
          liquidity + 1n,
          // uint8 installments;
          52,
          // uint32 duration;
          DURATION_1_YEAR,
          // uint256 attachedCollateral;
          initialCollat
        ]
      )).to.be.revertedWithCustomError(MercadoSantaFeContract, "NotEnoughLiquidity");
    });
  });

  describe("Getting my first loan", function () {
    it("Simple -1- loan and collateral validation.", async function () {
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

    // it("Loan parameters must be correct.", async function () {
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

    //   expect(
    //     await MercadoSantaFeContract.loanPrincipal()
    //   ).to.be.equal(ethers.parseUnits("1234", 18));



    //   let _status;
    //   for (let i = 0; i < 3; i++) {
    //     if (i == 0) { // we shoud be in installment 0.
    //       console.log("TIMESTAMP NOW: ", i, await MercadoSantaFeContract.test__getNow());
    //       expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
    //       _status = await MercadoSantaFeContract.getLoanDebtStatus(1);
    //       let maturedDebt =  _status.maturedDebt; // in pesos
    //       let nextInstallment = _status.nextInstallment; // in pesos
    //       let remainingDebt = _status[2];

    //       expect(maturedDebt).to.be.equal(0);
    //       console.log(await MercadoSantaFeContract.getLoan(1));
    //       expect(
    //         await MercadoSantaFeContract.getUserDebt(alice.address)
    //       ).to.be.within((3n * nextInstallment) - 1n, (3n * nextInstallment) + 1n);
    //       // expect(nextInstallment).to.be.equal() = _status.nextInstallment; // in pesos
    //       expect(
    //         await MercadoSantaFeContract.getUserDebt(alice.address)
    //       ).to.be.equal(remainingDebt);

    //       console.log("osito cup")
    //       console.log(maturedDebt)
    //       console.log(nextInstallment)
    //       console.log(remainingDebt)
    //       // expect(await MercadoSantaFeContract.test__loanDebt(loan)).to.be.equal(0);
    //     } else if (i == 1) { // we shoud be in installment 1.
    //       console.log("TIMESTAMP NOW: ", i, await MercadoSantaFeContract.test__getNow());
    //       expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);


    //     } else if (i == 2) {

    //       expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
    //     }

    //     console.log(await MercadoSantaFeContract.getIntervalDuration(1));
    //     await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
    //   }


    //   // for (i = 0; i < 100; i++) {
    //   //   await time.increase(ONE_DAY_IN_SECS_PLUS);
    //   //   await BorrowVerdeContract.accrue();
    //   // }

    //   // expect(await BorrowVerdeContract.owner()).to.be.equal(owner.address);
    //   // expect(await BorrowVerdeContract.verdeToken()).to.be.equal(VerdeTokenContract.target);
    //   // expect(await BorrowVerdeContract.collatAsset()).to.be.equal(USDCTokenContract.target);
    //   // expect(await BorrowVerdeContract.collatToUsdOracle()).to.be.equal(MPETHPriceFeedContract.target);
    //   // expect(await BorrowVerdeContract.treasuryVault()).to.be.equal(TreasuryVaultContract.target);
    //   // expect(await BorrowVerdeContract.minCollatAmount()).to.be.equal(ethers.parseEther("0.01"));

    //   // expect(await BorrowVerdeContract.safeLtvBp()).to.be.equal(5000);
    //   // expect(await BorrowVerdeContract.liquidationLtvBp()).to.be.equal(7000);
    //   // expect(await BorrowVerdeContract.liquidationPenaltyBp()).to.be.equal(500);
    // });

    // it("Invalid basis points limits MUST revert.", async function () {
    //   // const {
    //   //   MercadoSantaFeContract,
    //   //   USDCTokenContract,
    //   //   XOCTokenContract,
    //   //   owner,
    //   //   alice,
    //   //   bob,
    //   //   carl,
    //   // } = await loadFixture(deployProtocolFixture);

    //   // // const loan = {
    //   // //   owner: alice.address,
    //   // //   amount: ethers.parseUnits("1234", 18),
    //   // //   totalPayment: 0,
    //   // //   installments: 3,
    //   // //   apy: 800,
    //   // //   createdAt: await MercadoSantaFeContract.test__getNow(),
    //   // //   duration: 3 * 4 * 7 * 24 * 60 * 60, // aprox 3 months
    //   // //   attachedCollateral: ethers.parseUnits("500", 18),
    //   // // };

    //   // // await MercadoSantaFeContract.test__validateLoan(loan);

    //   // // console.log(loan);

    //   // // console.log(await MercadoSantaFeContract.test__loanDebt(loan));

    //   // let _status;
    //   // for (let i = 0; i < 3; i++) {
    //   //   if (i == 0) {
    //   //     // we shoud be in installment 0.
    //   //     expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
    //   //     _status = await MercadoSantaFeContract.test__loanDebt(loan);
    //   //     let maturedDebt =  _status.maturedDebt; // in pesos
    //   //     let nextInstallment = _status.nextInstallment; // in pesos
    //   //     let remainingDebt = _status[2];

    //   //     expect(maturedDebt).to.be.equal(0);
    //   //     expect(nextInstallment).to.be.equal() = _status.nextInstallment; // in pesos

    //   //     console.log("osito cup")
    //   //     console.log(maturedDebt)
    //   //     console.log(nextInstallment)
    //   //     console.log(remainingDebt)
    //   //     // expect(await MercadoSantaFeContract.test__loanDebt(loan)).to.be.equal(0);
    //   //   }
    //   // }


    // });
  });

  describe("Paying 3 installments loans", function () {
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

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

      // const borrowAmount = await MercadoSantaFeContract.estimateLoanAmount(initialCollat, 6000);
      const borrowAmount = ethers.parseUnits("1000", 18); // mil pesitos 🦅
      // console.log(ethers.formatEther(borrowAmount));

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
      // console.log(await MercadoSantaFeContract.getLoan(1));
      // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

      const apy = (await MercadoSantaFeContract.getLoan(1)).apy;
      const grandDebt = calcGrandTotal(borrowAmount, apy, await MercadoSantaFeContract.fixedLoanFee());
      const payment = grandDebt/3n;
      await XOCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);

      // Allocate enough to pay for interests.
      await XOCTokenContract.allocateTo(alice.address, grandDebt - borrowAmount);
      // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(payment);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      // *** INSTALLMENT 0 *********************************

      await MercadoSantaFeContract.connect(alice).pay(payment, 1);

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt - payment);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      // *** INSTALLMENT in the middle *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1); // moving to next installment

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(payment);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt - payment);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      await MercadoSantaFeContract.connect(alice).pay(payment, 1);

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt - (2n * payment));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      // *** Last INSTALLMENT *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2); // moving to next installment

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(await MercadoSantaFeContract.getUserDebt(alice.address));
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(await MercadoSantaFeContract.getUserDebt(alice.address));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      await MercadoSantaFeContract.connect(alice).pay(
        await MercadoSantaFeContract.getUserDebt(alice.address),
        1
      );

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      // *** AFTER Last INSTALLMENT *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3); // moving to next installment

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));
    });

    it("All payments lagging 1 installment.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = ethers.parseUnits("100", 6);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

      // const borrowAmount = await MercadoSantaFeContract.estimateLoanAmount(initialCollat, 6000);
      const borrowAmount = ethers.parseUnits("1000", 18); // mil pesitos 🦅
      // console.log(ethers.formatEther(borrowAmount));

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
      // console.log(await MercadoSantaFeContract.getLoan(1));
      // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

      const apy = (await MercadoSantaFeContract.getLoan(1)).apy;
      const grandDebt = calcGrandTotal(borrowAmount, apy, await MercadoSantaFeContract.fixedLoanFee());
      const payment = grandDebt/3n;
      await XOCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);

      // Allocate enough to pay for interests.
      await XOCTokenContract.allocateTo(alice.address, grandDebt - borrowAmount);
      // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(payment);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      // *** INSTALLMENT 0 *********************************

      // *** INSTALLMENT in the middle *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1); // moving to next installment

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(payment);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(2n * payment);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      await MercadoSantaFeContract.connect(alice).pay(payment, 1);

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(payment);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt - payment);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      // *** Last INSTALLMENT *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2); // moving to next installment

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(payment);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(await MercadoSantaFeContract.getUserDebt(alice.address));
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(await MercadoSantaFeContract.getUserDebt(alice.address));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      await MercadoSantaFeContract.connect(alice).pay(payment, 1);

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(await MercadoSantaFeContract.getUserDebt(alice.address));
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(await MercadoSantaFeContract.getUserDebt(alice.address));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      // *** AFTER Last INSTALLMENT *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3); // moving to next installment

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(await MercadoSantaFeContract.getUserDebt(alice.address));
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(await MercadoSantaFeContract.getUserDebt(alice.address));
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(await MercadoSantaFeContract.getUserDebt(alice.address));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3);

      await MercadoSantaFeContract.connect(alice).pay(
        await MercadoSantaFeContract.getUserDebt(alice.address),
        1
      );

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));
    });

    it("Single payment at installment 0.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = ethers.parseUnits("100", 6);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

      // const borrowAmount = await MercadoSantaFeContract.estimateLoanAmount(initialCollat, 6000);
      const borrowAmount = ethers.parseUnits("1000", 18); // mil pesitos 🦅
      // console.log(ethers.formatEther(borrowAmount));

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
      // console.log(await MercadoSantaFeContract.getLoan(1));
      // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

      const apy = (await MercadoSantaFeContract.getLoan(1)).apy;
      const grandDebt = calcGrandTotal(borrowAmount, apy, await MercadoSantaFeContract.fixedLoanFee());
      const payment = grandDebt/3n;
      await XOCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);

      // Allocate enough to pay for interests.
      await XOCTokenContract.allocateTo(alice.address, grandDebt - borrowAmount);
      // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(payment);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      // *** INSTALLMENT 0 *********************************

      await MercadoSantaFeContract.connect(alice).pay(grandDebt, 1);

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      // *** INSTALLMENT in the middle *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1); // moving to next installment

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      // *** Last INSTALLMENT *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2); // moving to next installment

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      // *** AFTER Last INSTALLMENT *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3); // moving to next installment

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));
    });

    it("Single payment at installment 1.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = ethers.parseUnits("100", 6);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

      // const borrowAmount = await MercadoSantaFeContract.estimateLoanAmount(initialCollat, 6000);
      const borrowAmount = ethers.parseUnits("1000", 18); // mil pesitos 🦅
      // console.log(ethers.formatEther(borrowAmount));

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
      // console.log(await MercadoSantaFeContract.getLoan(1));
      // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

      const apy = (await MercadoSantaFeContract.getLoan(1)).apy;
      const grandDebt = calcGrandTotal(borrowAmount, apy, await MercadoSantaFeContract.fixedLoanFee());
      const payment = grandDebt/3n;
      await XOCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);

      // Allocate enough to pay for interests.
      await XOCTokenContract.allocateTo(alice.address, grandDebt - borrowAmount);
      // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(payment);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      // *** INSTALLMENT 0 *********************************

      // *** INSTALLMENT in the middle *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1); // moving to next installment

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(payment);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(2n * payment);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      await MercadoSantaFeContract.connect(alice).pay(grandDebt, 1);

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      // *** Last INSTALLMENT *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2); // moving to next installment

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      // *** AFTER Last INSTALLMENT *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3); // moving to next installment

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));
    });

    it("Single payment at installment 2.", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = ethers.parseUnits("100", 6);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

      // const borrowAmount = await MercadoSantaFeContract.estimateLoanAmount(initialCollat, 6000);
      const borrowAmount = ethers.parseUnits("1000", 18); // mil pesitos 🦅
      // console.log(ethers.formatEther(borrowAmount));

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
      // console.log(await MercadoSantaFeContract.getLoan(1));
      // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

      const apy = (await MercadoSantaFeContract.getLoan(1)).apy;
      const grandDebt = calcGrandTotal(borrowAmount, apy, await MercadoSantaFeContract.fixedLoanFee());
      const payment = grandDebt/3n;
      await XOCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);

      // Allocate enough to pay for interests.
      await XOCTokenContract.allocateTo(alice.address, grandDebt - borrowAmount);
      // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(payment);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      // *** INSTALLMENT 0 *********************************

      // *** INSTALLMENT in the middle *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1); // moving to next installment

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(payment);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(2n * payment);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      // *** Last INSTALLMENT *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2); // moving to next installment

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(2n * payment);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(grandDebt);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      await MercadoSantaFeContract.connect(alice).pay(grandDebt, 1);

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      // *** AFTER Last INSTALLMENT *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3); // moving to next installment

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));
    });

    it("Single payment at installment 3 (late).", async function () {
      const {
        MercadoSantaFeContract,
        BodegaContract,
        USDCTokenContract,
        XOCTokenContract,
        alice,
        bob,
      } = await loadFixture(deployProtocolFixture);

      const initialCollat = ethers.parseUnits("100", 6);

      /// Deposit liquidity.
      await XOCTokenContract.connect(bob).approve(BodegaContract.target, MLARGE);
      await BodegaContract.connect(bob).deposit(await XOCTokenContract.balanceOf(bob.address), bob.address);

      await USDCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);
      await MercadoSantaFeContract.connect(alice).depositCollateral(alice.address, initialCollat);

      // const borrowAmount = await MercadoSantaFeContract.estimateLoanAmount(initialCollat, 6000);
      const borrowAmount = ethers.parseUnits("1000", 18); // mil pesitos 🦅
      // console.log(ethers.formatEther(borrowAmount));

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
      // console.log(await MercadoSantaFeContract.getLoan(1));
      // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

      const apy = (await MercadoSantaFeContract.getLoan(1)).apy;
      const grandDebt = calcGrandTotal(borrowAmount, apy, await MercadoSantaFeContract.fixedLoanFee());
      const payment = grandDebt/3n;
      await XOCTokenContract.connect(alice).approve(MercadoSantaFeContract.target, MLARGE);

      // Allocate enough to pay for interests.
      await XOCTokenContract.allocateTo(alice.address, grandDebt - borrowAmount);
      // console.log("alice balance: ", await XOCTokenContract.balanceOf(alice.address));

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(payment);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      // *** INSTALLMENT 0 *********************************

      // *** INSTALLMENT in the middle *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(0);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1); // moving to next installment

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(payment);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(2n * payment);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      // *** Last INSTALLMENT *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(1);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2); // moving to next installment

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(2n * payment);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(grandDebt);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      // *** AFTER Last INSTALLMENT *********************************

      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(2);
      await time.increase(await MercadoSantaFeContract.getIntervalDuration(1));
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3); // moving to next installment

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(grandDebt);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(grandDebt);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(grandDebt);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));

      await MercadoSantaFeContract.connect(alice).pay(grandDebt, 1);

      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[0]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[1]).to.be.equal(0);
      expect((await MercadoSantaFeContract.getLoanDebtStatus(1))[2]).to.be.equal(0);
      expect(await MercadoSantaFeContract.getInstallment(1)).to.be.equal(3);
      // console.log(await MercadoSantaFeContract.getLoanDebtStatus(1));
    });
  });
});