// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626, IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IBodegaDeChocolates} from "./interfaces/IBodegaDeChocolates.sol";
import {IPriceFeed} from "./interfaces/IPriceFeed.sol";
import {Loan, LoanDebtStatus, LoanForm, LoanLib} from "./lib/Loan.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Uncomment this line to use console.log
import "hardhat/console.sol";

uint256 constant MAX_LOANS_BY_USER = 3;

/// @param loanIds IMPORTANT: 3 is the max loans for user. LoanId == 0 means, no loan at all.
struct User {
    uint256 balanceCollat;
    // uint256 debt; // debt is always changing.
    uint256[MAX_LOANS_BY_USER] loanIds;
}

/// CDP collateral debt possition

/// @title Mercado Santa Fe - Collateralize asset A and get asset B credits.
/// Lend asset B and get APY on asset B or, in liquidations, in collateral.
/// @author Centauri devs team ✨
contract MercadoSantaFe {

    using SafeERC20 for IERC20;
    using Math for uint256;
    using EnumerableSet for EnumerableSet.AddressSet;
    using LoanLib for Loan;

    /// Constants -----------------------------------------------------------------------

    /// @dev Constant value for exchange rates conversion.
    uint256 private immutable _collat2PesosConversionConstant;

    /// @dev If collat and pesos decimals are equal, then `_decimalOffset` equals 0.
    uint8 private immutable _decimalsOffset;

    address public immutable collateral;
    IBodegaDeChocolates public immutable bodega;
    IPriceFeed public immutable collatToPesosOracle;

    uint16 private constant BASIS_POINTS = 100_00; // 100.00%

    /// @dev Amount is in pesos.
    uint256 private constant MAX_CREDIT_AMOUNT = 10_000 * 10**18;
    uint256 public constant MIN_CREDIT_AMOUNT = 100 * 10**18;

    /// @dev How many installments?
    uint8 private constant MAX_INSTALLMENTS = 52;
    uint8 private constant MIN_INSTALLMENTS = 2; // 2 installments are required by loanDebtStatus

    /// @dev APY is always in basis point 8.00% == 800;
    uint16 private constant BASE_APY_BP = 8_00;

    uint16 public constant SAFE_INITIAL_LTV_BP = 60_00;
    uint16 public constant MAX_INITIAL_LTV_BP = 85_00;

    uint32 private constant MAX_DURATION = 365 days;
    uint32 private constant MIN_DURATION = 1 weeks;

    uint32 private constant MAX_TIME_BETWEEN_INSTALLS = (4 * 1 weeks); // aprox 1 month.
    uint32 private constant MIN_TIME_BETWEEN_INSTALLS = 1 days;

    /// Storage -------------------------------------------------------------------------

    EnumerableSet.AddressSet private _activeUsers; /// addresses with an active Loan

    uint256 public nextLoanId;

    /// @dev An account cannot have less than minCollateralAmount in vault;
    uint256 public minCollateralAmount;

    /// @dev Collateral, and all sort of good User stuff. user => balance
    mapping (address => User) public users;

    /// @dev LoanId => Loan.
    mapping (uint256 => Loan) private loans;

    /// @dev refers to the original amount loaned, before interest is added.
    uint256 public loanPrincipal;

    /// @dev refers to the loan principal plus interest. Do not include penalties.
    uint256 public loanAmountWithInterest;

    /// Errors & events -----------------------------------------------------------------

    event Withdrawal(uint amount, uint when);

    error ApyGreaterThanAccepted(uint256 _apy);
    error CollatLessThanAmount();
    error CollateralBellowMaxLtv();
    error DoNotLeaveDust(uint256 _change);
    error InvalidBasisPoint();
    error InvalidInput();
    error InvalidIntervalDuration();
    error InvalidLoanAmount();
    error InvalidLoanDuration();
    error InvalidLoanInstallments();
    error InvalidUInt16();
    error LessThanMinCollatAmount();
    error LoanDoesNotExist(uint256 _loanId);
    error LoanIsFullyPaid();
    error MaxLoansByUser();
    error NegativeNumber();
    error NotEnoughBalance();
    error NotEnoughCollatToBorrow();
    error NotEnoughLiquidity();
    error PayOnlyWhatYouOwn(uint256 _remainingDebt);

    modifier loanExists(uint256 _loanId) {
        _assertLoanExists(_loanId);
        _;
    }

    constructor(
        IERC20 _collateral,
        IBodegaDeChocolates _bodega,
        IPriceFeed _collatToPesosOracle,
        uint256 _minCollateralAmount
    ) {
        collateral = address(_collateral);
        bodega = _bodega;
        collatToPesosOracle = _collatToPesosOracle;
        minCollateralAmount = _minCollateralAmount;

        nextLoanId = 1; // loan-id 0 means no loan at all.

        uint8 collatDecimals = IERC20Metadata(address(_collateral)).decimals();
        uint8 pesosDecimals = IERC20Metadata(_bodega.asset()).decimals();
        if (pesosDecimals > collatDecimals) {
            _decimalsOffset = pesosDecimals - collatDecimals;
        }
        // Keep this constant factor at hand for Exchange Rate conversion.
        _collat2PesosConversionConstant = 10 ** (
            _collatToPesosOracle.decimals()
            + 18
            - pesosDecimals
        );
    }

    /// Public View functions -----------------------------------------------------------

    /// @dev Duration of the loan, divided by the number of intervals.
    function getIntervalDuration(
        uint256 _loanId
    ) external view loanExists(_loanId) returns (uint256) {
        return loans[_loanId].intervalDuration();
    }

    function getInstallment(
        uint256 _loanId
    ) external view loanExists(_loanId) returns (uint256) {
        return loans[_loanId].getInstallment();
    }

    function getLoanDebtStatus(
        uint256 _loanId
    ) external view loanExists(_loanId) returns (LoanDebtStatus memory) {
        return _loanDebtStatus(loans[_loanId]);
    }

    function getLoan(
        uint256 _loanId
    ) external view loanExists(_loanId) returns (Loan memory) {
        return loans[_loanId];
    }

    /// @dev max active loans per user is given by `MAX_LOANS_BY_USER`.
    function getActiveLoans(address _account) external view returns (uint8) {
        return _getUserActiveLoans(users[_account]);
    }

    function getUsersLoanIds(
        address _account
    ) external view returns (uint256[MAX_LOANS_BY_USER] memory) {
        return users[_account].loanIds;
    }

    function getMaxLoansPerUser() external pure returns (uint256) {
        return MAX_LOANS_BY_USER;
    }

    /// @dev total debt distributed on all the loans.
    function getUserDebt(address _account) external view returns (uint256 _amount) {
        User memory _user = users[_account];
        for (uint i; i < _user.loanIds.length; i++) {
            uint _id = _user.loanIds[i];
            // console.log("ITS me mario", i);
            // console.log("ITS me mario", _id);
            // console.log(loans[_id].grandDebt());
            // console.log(loans[_id].totalPayment);
            if (_id > 0) _amount += (loans[_id].grandDebt() - loans[_id].totalPayment);
        }
    }

    function getUserCollat(address _amount) external view returns (uint256) {
        return users[_amount].balanceCollat;
    }

    function calculateAPY(
        uint256 _amount,
        uint32 _duration,
        uint256 _attachedCollateral
    ) public view returns (uint256) {
        if (_amount == 0 || _duration == 0 || _attachedCollateral == 0) {
            revert InvalidInput();
        }

        uint256 collatInPesos = fromCollatToPesos(_attachedCollateral);
        if (_amount > collatInPesos) revert CollatLessThanAmount();

        uint256 ltv = _amount.mulDiv(BASIS_POINTS, collatInPesos, Math.Rounding.Ceil);
        if (ltv > MAX_INITIAL_LTV_BP) revert CollateralBellowMaxLtv();
        return _calculateAPY(_duration, ltv);
    }

    /// @param _amount in collateral.
    /// @return The loan in pesos using `_ltvBp`.
    function estimateLoanAmount(
        uint256 _amount,
        uint16 _ltvBp
    ) external view returns (uint256) {
        if (_ltvBp > BASIS_POINTS) revert InvalidBasisPoint();
        return fromCollatToPesos(_amount).mulDiv(_ltvBp, BASIS_POINTS, Math.Rounding.Floor);
    }

    /// @param _amount in Pesos.
    /// @return The collateral amount required to get a loan of `_amount` in Pesos.
    function estimateLoanCollat(
        uint256 _amount,
        uint16 _ltvBp
    ) external view returns (uint256) {
        if (_ltvBp > BASIS_POINTS) revert InvalidBasisPoint();
        return fromCollatToPesos(_amount.mulDiv(BASIS_POINTS, _ltvBp, Math.Rounding.Floor));
    }

    function getFixedLoanFee() external pure returns (uint256) {
        return LoanLib.getFixedLoanFee();
    }

    /// Managing the Collateral ---------------------------------------------------------

    function depositCollateral(address _to, uint256 _amount) external {
        if (_to == address(0)) revert InvalidInput();
        if (_amount < minCollateralAmount) revert LessThanMinCollatAmount();

        doTransferIn(collateral, msg.sender, _amount);
        users[_to].balanceCollat += _amount;
    }

    function withdrawCollateral(uint256 _amount) external {
        if (_amount == 0) revert InvalidInput();
        uint256 balance = users[msg.sender].balanceCollat;

        if (_amount > balance) revert NotEnoughBalance();
        uint256 change = balance - _amount;

        if (change > 0 && change < minCollateralAmount) revert DoNotLeaveDust(change);
        users[msg.sender].balanceCollat = change;
        doTransferOut(collateral, msg.sender, _amount);
    }

    function withdrawAll() external {
        uint256 amountCollat = users[msg.sender].balanceCollat;
        if (amountCollat == 0) revert NotEnoughBalance();

        users[msg.sender].balanceCollat = 0;
        doTransferOut(collateral, msg.sender, amountCollat);
    }

    /// Borrowing Pesos 🪙 ---------------------------------------------------------------

    function borrow(LoanForm memory _form) external {
        User storage user = users[msg.sender];

        /// Lock Collateral
        if (user.balanceCollat < _form.attachedCollateral) revert NotEnoughCollatToBorrow();
        user.balanceCollat -= _form.attachedCollateral;

        _borrow(user, _form, msg.sender);
    }

    function depositAndBorrow(LoanForm memory _form) external {
        User storage user = users[msg.sender];

        /// Get Collateral
        if (_form.attachedCollateral < minCollateralAmount) revert LessThanMinCollatAmount();
        doTransferIn(collateral, msg.sender, _form.attachedCollateral);

        _borrow(user, _form, msg.sender);
    }

    /// Pay what you own 🪙 --------------------------------------------------------------

    function pay(uint256 _amount, uint256 _loanId) external loanExists(_loanId) {
        Loan storage loan = loans[_loanId];

        if (loan.isFullyPaid()) revert LoanIsFullyPaid();

        doTransferIn(bodega.asset(), msg.sender, _amount);

        LoanDebtStatus memory _status = _loanDebtStatus(loan);
        uint256 remainingDebt = _status.remainingDebt;
        // if (late) remainingDebt += _getPenalty(loan)

        if (_amount > remainingDebt) revert PayOnlyWhatYouOwn(remainingDebt);

        /// updating Storage
        loan.totalPayment += _amount;

        /// sending payment to Bodega
        IERC20(bodega.asset()).safeIncreaseAllowance(address(bodega), _amount);
        bodega.receivePayment(_amount);
    }

    /// Core funtionalities 🌎 -----------------------------------------------------------

    function _borrow(
        User storage _user,
        LoanForm memory _form,
        address _owner
    ) private {
        /// LTV
        uint256 collatInPesos = fromCollatToPesos(_form.attachedCollateral);
        uint256 ltv = _form.amount.mulDiv(BASIS_POINTS, collatInPesos, Math.Rounding.Ceil);
        if (ltv > MAX_INITIAL_LTV_BP) revert CollateralBellowMaxLtv();

        /// APY
        uint256 apy = _calculateAPY(_form.duration, ltv);
        if (apy > _form.maxAcceptedApy) revert ApyGreaterThanAccepted(apy);

        /// Create and validate Loan.
        Loan memory loan = _convertToLoan(_form, apy, _owner);
        _validateLoan(loan);
        uint256 loanId = nextLoanId++;

        /// AT THIS POINT THE LOAN SHOULD BE 100% VALIDATED.

        /// @dev FIND the first available loan id, or revert.
        _assignNewLoanTo(_user, loanId); // Revert if max number of loans.
        loans[loanId] = loan;
        _activeUsers.add(_owner);
        
        // updating storage
        loanPrincipal += loan.amount;
        loanAmountWithInterest += loan.grandDebt();

        /// TODO
        bodega.lend(_owner, loan.amount);
    }

    /// PRIVATE PARTY 🎛️ ----------------------------------------------------------------

    function _convertToLoan(
        LoanForm memory _loanForm,
        uint256 _apy,
        address _owner
    ) internal view returns (Loan memory _loan) {
        return Loan({
            owner: _owner,
            amount: _loanForm.amount,
            totalPayment: 0,
            installments: _loanForm.installments,
            apy: safe16(_apy),
            createdAt: block.timestamp,
            duration: _loanForm.duration,
            attachedCollateral: _loanForm.attachedCollateral
        });
    }

    function _assignNewLoanTo(User storage _user, uint256 _newLoanId) private {
        for (uint i; i < MAX_LOANS_BY_USER; i++) {
            if (_user.loanIds[i] == 0) {
                // replace it to the new loan id
                _user.loanIds[i] = _newLoanId;
                return;
            }
        }
        // "No more available loans"
        revert MaxLoansByUser();
    }

    function _validateLoan(Loan memory _loan) internal view {
        if (_loan.amount > bodega.availableAsset()) revert NotEnoughLiquidity();

        if (_loan.amount > MAX_CREDIT_AMOUNT
                || _loan.amount < MIN_CREDIT_AMOUNT) revert InvalidLoanAmount();

        if (_loan.installments > MAX_INSTALLMENTS
                || _loan.installments < MIN_INSTALLMENTS) revert InvalidLoanInstallments();

        if (_loan.intervalDuration() > MAX_TIME_BETWEEN_INSTALLS
                || _loan.intervalDuration() < MIN_TIME_BETWEEN_INSTALLS) revert InvalidIntervalDuration();

        if (_loan.duration > MAX_DURATION 
                || _loan.duration < MIN_DURATION) revert InvalidLoanDuration();

        /// TODO: CHECK A RELATION BETWEEN APY AND DURATION + TOTAL_LIQUIDITY.
    }

    // function _loanProgress(Loan memory _loan) internal view returns (uint256) {
    //     if (_loan.createdAt <= block.timestamp) return 0;

    //     uint256 loanEnds = _loan.createdAt + _loan.duration;
    //     if (block.timestamp < loanEnds) {
    //         uint256 elapsedTime = block.timestamp - _loan.createdAt;
    //         return elapsedTime.mulDiv(10**18, _loan.duration);
    //     }
    //     return 10**18; // 100%
    // }





    // function _removeDecimals(uint256 _payment) internal returns (uint256) {
    //     return (_payment / 10 ** decimals()) * 10 ** decimals();
    // }



    /// @dev this function consider different scenarios, using the block.timestamp.
    function _loanDebtStatus(Loan memory _loan) internal view returns (LoanDebtStatus memory _status) {

        uint256 today = block.timestamp;
        uint256 intervalDuration = _loan.intervalDuration();

        // Loan Grand Debt. Includes fee.
        uint256 grandDebt = _loan.grandDebt();

        // Last payment must be for the total debt.
        uint256 payment = grandDebt.mulDiv(1, _loan.installments, Math.Rounding.Floor);
        /// TODO: It could be nice if the payment is softly rounded.
        // payment = _removeDecimals(payment);

        uint256 whereAmI = _loan.getInstallment();


        // console.log("today: ", today);
        // console.log("intervalDuration: ", intervalDuration);
        // console.log("grandDebt: ", grandDebt);
        // console.log("payment: ", payment);
        // console.log("whereAmI: ", whereAmI);

        uint256 remainingDebt = grandDebt - _loan.totalPayment;
        uint256 totalDebtNow = payment * whereAmI;
        uint256 totalDebtNext;

        if (whereAmI == 0) {
            return LoanDebtStatus(
                0,
                _loan.totalPayment >= payment ? 0 : payment - _loan.totalPayment,
                grandDebt - _loan.totalPayment
            );
        } else if (whereAmI == _loan.installments) { // LATE 🌙
            return LoanDebtStatus({
                maturedDebt: remainingDebt,
                nextInstallment: remainingDebt,
                remainingDebt: remainingDebt
            });
        } else if (whereAmI == (_loan.installments - 1)) { // LAST INSTALLMENT
            return LoanDebtStatus({
                maturedDebt: _loan.totalPayment >= totalDebtNow ? 0 : totalDebtNow - _loan.totalPayment,
                nextInstallment: remainingDebt,
                remainingDebt: remainingDebt
            });
        } else {
            totalDebtNext = payment * (whereAmI + 1);
            return LoanDebtStatus({
                maturedDebt: _loan.totalPayment >= totalDebtNow ? 0 : totalDebtNow - _loan.totalPayment,
                nextInstallment: _loan.totalPayment >= totalDebtNext ? 0 : totalDebtNext - _loan.totalPayment,
                remainingDebt: _loan.totalPayment >= grandDebt ? 0 : remainingDebt
            });
        }
    }

    /// TODO should we consider the available liquidity?
    function _calculateAPY(uint32 _duration, uint256 _initialLtv) private pure returns (uint256 _apy) {
        _apy = uint256(BASE_APY_BP);
        // if (_initialLtv > SAFE_INITIAL_LTV_BP) {
        //     _apy += uint256(BASE_APY_BP).mulDiv(_initialLtv, MAX_INITIAL_LTV_BP);
        // }
        // if (_duration > 4 weeks) {
        //     _apy += uint256(BASE_APY_BP).mulDiv(_duration, MAX_DURATION);
        // }
    }

    /// @dev The price in base asset pesos, of the collateral.
    /// @param _amount in collateral.
    /// @return The value in Pesos of the _amount in collateral.
    function fromCollatToPesos(uint256 _amount) internal view returns (uint256) {
        return (_amount * 10**_decimalsOffset).mulDiv(
            collatPricePesos(),
            _collat2PesosConversionConstant,
            Math.Rounding.Floor
        );
    }

    /// @param _amount in pesos.
    /// @return The equivalent on collateral for the `_amount` in Pesos.
    function fromPesosToCollat(uint256 _amount) internal view returns (uint256) {
        return _amount.mulDiv(
            _collat2PesosConversionConstant,
            collatPricePesos() * 10**_decimalsOffset,
            Math.Rounding.Floor
        );
    }

    /// @return Following Chainlink standard, `price` has 8 decimals.
    function collatPricePesos() internal view returns (uint256) {
        (, int256 price,,,) = collatToPesosOracle.latestRoundData();
        return unsigned256(price);
    }

    function _getUserActiveLoans(User memory _user) internal pure returns (uint8 _res) {
        uint256[MAX_LOANS_BY_USER] memory loanIds = _user.loanIds;
        
        for (uint i; i < MAX_LOANS_BY_USER; i++) {
            if (loanIds[i] > 0) _res++;
        }
    }

    function safe16(uint256 _amount) private pure returns (uint16) {
        if (_amount > type(uint16).max) revert InvalidUInt16();
        return uint16(_amount);
    }

    /// @dev Safe conversion from signed integer to unsigned.
    function unsigned256(int256 _amount) private pure returns (uint256) {
        if (_amount < 0) revert NegativeNumber();
        return uint256(_amount);
    }

    function doTransferIn(address _asset, address _from, uint256 _amount) private {
        IERC20(_asset).safeTransferFrom(_from, address(this), _amount);
    }

    function doTransferOut(address _asset, address _to, uint256 _amount) private {
        IERC20(_asset).safeTransfer(_to, _amount);
    }

    function _assertLoanExists(uint256 _loanId) private view {
        if (_loanId == 0 || _loanId >= nextLoanId) revert LoanDoesNotExist(_loanId);
    }
}
