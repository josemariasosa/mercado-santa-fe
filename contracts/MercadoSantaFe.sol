// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
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

    uint16 private constant BASIS_POINTS = 100_00; // 100.00%

    address public immutable collateral;
    IBodegaDeChocolates public immutable bodega;
    IPriceFeed public immutable collatToPesosOracle;

    /// @dev Amount is in pesos.
    uint256 private constant MAX_CREDIT_AMOUNT = 10_000 * 10**18;
    uint256 private constant MIN_CREDIT_AMOUNT =  1_000 * 10**18;

    /// @dev How many installments?
    uint8 private constant MAX_INSTALLMENTS = 52;
    uint8 private constant MIN_INSTALLMENTS = 1;

    /// @dev APY is always in basis point 8.00% == 800;
    uint16 private constant BASE_APY_BP = 8_00;

    uint16 public constant SAFE_INITIAL_LTV_BP = 60_00;
    uint16 public constant MAX_INITIAL_LTV_BP = 85_00;

    uint32 private constant MAX_DURATION = 365 days;
    uint32 private constant MIN_DURATION = 1 weeks;
    uint32 private constant MAX_TIME_BETWEEN_INSTALLS = (4 * 1 weeks); // aprox 1 month.

    /// Storage -------------------------------------------------------------------------

    EnumerableSet.AddressSet private _activeUsers; /// addresses with an active Loan

    uint256 public nextLoanId;

    /// @dev An account cannot have less than minCollateralAmount in vault;
    uint256 public minCollateralAmount;

    /// @dev Collateral, and all sort of good User stuff. user => balance
    mapping (address => User) public users;

    /// @dev LoanId => Loan.
    mapping (uint256 => Loan) public loans;

    /// @dev refers to the original amount loaned, before interest is added.
    uint256 public loanPrincipal;

    /// @dev refers to the loan principal plus interest. Do not include penalties.
    uint256 public loanAmountWithInterest;

    /// Errors & events -----------------------------------------------------------------

    event Withdrawal(uint amount, uint when);

    error InvalidLoanAmount();
    error InvalidLoanInstallments();
    error InvalidLoanAPY();
    error InvalidLoanDuration();
    error InvalidCollateral(address _token);
    error LoanIsFullyPaid();
    error NotEnoughCollateral();
    error InvalidInput();
    error NotEnoughBalance();
    error DoNotLeaveDust(uint256 _change);
    error NotEnoughLiquidity();
    error MaxLoansByUser();
    error NotAcceptingNewLoans();
    error ApyGreaterThanLimit(uint256 _apy);
    error InvalidUInt16();
    error PayOnlyWhatYouOwn(uint256 _remainingDebt);
    error CollateralBellowMaxLtv(uint256 _initialLtv);

    modifier loansOpen {
        if (!bodega.acceptingNewLoans()) revert NotAcceptingNewLoans();
        _;
    }

    constructor(
        IERC20 _collateral,
        IBodegaDeChocolates _bodega,
        IPriceFeed _collatToPesosOracle
    ) {
        collateral = address(_collateral);
        bodega = _bodega;
        collatToPesosOracle = _collatToPesosOracle;

        nextLoanId = 1; // loan-id 0 means no loan at all.
    }

    /// Public View functions -----------------------------------------------------------

    /// @dev Duration of the loan, divided by the number of intervals.
    function getIntervalDuration(uint256 _loanId) external view returns (uint256) {
        if (_loanId == 0) revert InvalidInput();
        return loans[_loanId].intervalDuration();
    }

    function getInstallment(uint256 _loanId) external view returns (uint256) {
        if (_loanId == 0) revert InvalidInput();
        return loans[_loanId].getInstallment();
    }

    function getLoanDebtStatus(
        uint256 _loanId
    ) external view returns (LoanDebtStatus memory) {
        if (_loanId == 0) revert InvalidInput();
        return _loanDebtStatus(loans[_loanId]);
    }

    function getLoan(uint256 _loanId) external view returns (Loan memory) {
        if (_loanId == 0) revert InvalidInput();
        return loans[_loanId];
    }

    /// @dev max active loans per user is given by `MAX_LOANS_BY_USER`.
    function getActiveLoans(address _account) external view returns (uint8) {
        return _getUserActiveLoans(users[_account]);
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

    function calculateAPY(
        uint256 _amount,
        uint32 _duration,
        uint256 _attachedCollateral
    ) public pure returns (uint256) {
        uint256 initialLtv = _amount.mulDiv(1, fromETHtoPeso(_attachedCollateral));
        if (initialLtv > MAX_INITIAL_LTV_BP) revert CollateralBellowMaxLtv(initialLtv);
        return _calculateAPY(_duration, initialLtv);
    }

    /// Managing the Collateral ---------------------------------------------------------

    function depositCollateral(address _to, uint256 _amount) external {
        if (_to == address(0)) revert InvalidInput();
        if (_amount < minCollateralAmount) revert InvalidInput();

        doTransferIn(collateral, msg.sender, _amount);
        users[_to].balanceCollat += _amount;
    }

    function withdrawCollateral(uint256 _amount) external {
        if (_amount == 0) revert InvalidInput();
        uint256 balance = users[msg.sender].balanceCollat;

        if (_amount > balance) revert NotEnoughBalance();
        uint256 change = balance - _amount;

        if (change < minCollateralAmount) revert DoNotLeaveDust(change);
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

    function borrow(LoanForm memory _form) external loansOpen {
        User storage user = users[msg.sender];

        /// Lock Collateral
        if (user.balanceCollat < _form.attachedCollateral) revert NotEnoughCollateral();
        user.balanceCollat -= _form.attachedCollateral;

        _borrow(user, _form, msg.sender);
    }

    function depositAndBorrow(LoanForm memory _form) external loansOpen {
        User storage user = users[msg.sender];

        /// Get Collateral
        if (_form.attachedCollateral < minCollateralAmount) revert InvalidInput();
        doTransferIn(collateral, msg.sender, _form.attachedCollateral);

        _borrow(user, _form, msg.sender);
    }

    /// Pay what you own 🪙 --------------------------------------------------------------

    function pay(uint256 _amount, uint256 _loanId) external {
        if (_loanId == 0) revert InvalidInput();

        Loan storage loan = loans[_loanId];

        if (loan.isFullyPaid()) revert LoanIsFullyPaid();

        doTransferIn(bodega.asset(), msg.sender, _amount);

        LoanDebtStatus memory _status = _loanDebtStatus(loan);
        uint256 remainingDebt = _status.remainingDebt;
        // if (late) remainingDebt += _getPenalty(loan)

        if (_amount > remainingDebt) revert PayOnlyWhatYouOwn(remainingDebt);

        /// updating Storage
        loan.totalPayment += _amount;
    }

    /// Core funtionalities 🌎 -----------------------------------------------------------

    function _borrow(
        User storage _user,
        LoanForm memory _form,
        address _owner
    ) private {
        /// LTV
        uint256 initialLtv = _form.amount.mulDiv(1, fromETHtoPeso(_form.attachedCollateral));
        if (initialLtv > MAX_INITIAL_LTV_BP) revert CollateralBellowMaxLtv(initialLtv);

        /// APY
        uint256 apy = _calculateAPY(_form.duration, initialLtv);
        if (apy > _form.maxAcceptedApy) revert ApyGreaterThanLimit(apy);

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

        if (_loan.amount > MAX_CREDIT_AMOUNT) revert InvalidLoanAmount();
        if (_loan.amount < MIN_CREDIT_AMOUNT) revert InvalidLoanAmount();

        if (_loan.installments > MAX_INSTALLMENTS) revert InvalidLoanInstallments();
        if (_loan.installments < MIN_INSTALLMENTS) revert InvalidLoanInstallments();

        require(_loan.intervalDuration() >= MAX_TIME_BETWEEN_INSTALLS); /// check after updating the value.

        if (_loan.duration > MAX_DURATION) revert InvalidLoanDuration();
        if (_loan.duration < MIN_DURATION) revert InvalidLoanDuration();

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


        console.log("today: ", today);
        console.log("intervalDuration: ", intervalDuration);
        console.log("grandDebt: ", grandDebt);
        console.log("payment: ", payment);
        console.log("whereAmI: ", whereAmI);

        uint256 remainingDebt = grandDebt - _loan.totalPayment;

        if (whereAmI == 0) {
            return LoanDebtStatus(
                0,
                payment,
                grandDebt - _loan.totalPayment
            );
        } else if (whereAmI < _loan.installments) { // TODO: do I have to (- 1)? we are the last
            // uint256 maturedDebt = FIXED_LOAN_FEE + (_loan.installments - 1) * paymen
            /// I AM THE LAST --
            return LoanDebtStatus({
                maturedDebt: _loan.totalPayment >= grandDebt ? 0 : remainingDebt,
                nextInstallment: _loan.totalPayment >= grandDebt ? 0 : remainingDebt,
                remainingDebt: remainingDebt
            });
        } else {
            uint256 totalDebtNow = payment * whereAmI;
            uint256 totalDebtNext = payment * (whereAmI + 1);
            uint256 remainingDebtNow = totalDebtNow - _loan.totalPayment;
            uint256 remainingDebtNext = totalDebtNext - _loan.totalPayment;
            return LoanDebtStatus({
                maturedDebt: _loan.totalPayment >= totalDebtNow ? 0 : remainingDebtNow,
                nextInstallment: _loan.totalPayment >= totalDebtNext ? 0 : remainingDebtNext,
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

    /// TODO: use real oracle.
    /// @dev The price in base asset pesos, of the collateral (mpETH).
    function fromETHtoPeso(uint256 _amount) internal pure returns (uint256 _price) {
        _price = _amount.mulDiv(10000, 1);
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

    function doTransferIn(address _asset, address _from, uint256 _amount) private {
        IERC20(_asset).safeTransferFrom(_from, address(this), _amount);
    }

    function doTransferOut(address _asset, address _to, uint256 _amount) private {
        IERC20(_asset).safeTransfer(_to, _amount);
    }
}
