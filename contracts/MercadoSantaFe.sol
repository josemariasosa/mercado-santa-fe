// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {Loan, LoanDebtStatus, LoanForm, LoanLib} from "./lib/Loan.sol";
import {IBodegaDeChocolates} from "./interfaces/IBodegaDeChocolates.sol";

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

    IERC20 public immutable collateral;
    IBodegaDeChocolates public immutable bodega;

    address public immutable creditAsset ; // immutable

    /// @dev Amount is in pesos.
    uint256 public constant MAX_CREDIT_AMOUNT = 10_000 * 10**18;
    uint256 public constant MIN_CREDIT_AMOUNT =  1_000 * 10**18;
    uint256 public constant FIXED_LOAN_FEE = 100 * 10**18; // Can be zero.

    /// @dev How many installments?
    uint8 public constant MAX_INSTALLMENTS = 52;
    uint8 public constant MIN_INSTALLMENTS = 1;

    /// @dev APY is always in basis point 8.00% == 800;
    uint16 public constant MAX_APY_BP = type(uint16).max;
    uint16 public constant MIN_APY_BP = 8_00;

    uint32 public constant MAX_DURATION = 365 days;
    uint32 public constant MIN_DURATION = 1 weeks;
    uint32 private constant MAX_TIME_BETWEEN_INSTALLS = (4 * 1 weeks); // aprox 1 month.

    /// Storage -------------------------------------------------------------------------

    EnumerableSet.AddressSet private _activeUsers; /// addresses with an active Loan

    uint256 public nextLoanId;

    /// @dev An account cannot have less than minCollateralAmount in vault;
    uint256 public minCollateralAmount;

    /// @dev Collateral, and all sort of good User stuff. user => balance
    mapping (address => User) public users;

    mapping (uint256 => Loan) public loans;

    /// @dev refers to the original amount loaned, before interest is added.
    uint256 public loanPrincipal;


    /// Errors & events -----------------------------------------------------------------

    event Withdrawal(uint amount, uint when);

    error InvalidLoanAmount();
    error InvalidLoanInstallments();
    error InvalidLoanAPY();
    error InvalidLoanDuration();
    error InvalidCollateral(address _token);
    error InvalidInput();
    error NotEnoughBalance();
    error DoNotLeaveDust(uint256 _change);
    error NotEnoughLiquidity();
    error MaxLoansByUser();

    constructor(
        IERC20 _collateral,
        IBodegaDeChocolates _bodega
    ) {
        collateral = _collateral;
        bodega = _bodega;

        nextLoanId = 1; // loan-id 0 means no loan at all.
    }

    function _getUserActiveLoans(User memory _user) internal returns (uint8 _res) {
        uint256[MAX_LOANS_BY_USER] memory loanIds = _user.loanIds;
        
        for (uint i; i < MAX_LOANS_BY_USER; i++) {
            if (loanIds[i] > 0) {
                _res++;
            }
        }
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

    function borrow(LoanForm memory _form) external {
        User storage user = users[msg.sender];
        Loan memory newLoan = _convertToLoan(_form, msg.sender); // Revert if _form is invalid.
        uint256 loanId = nextLoanId++;

        uint256 collateralTotalValue = fromETHtoPeso(user.balanceCollat);
        uint256 maxBorrow = collateralTotalValue.mulDiv(85_00, 100_00); // LTV
        require(_form.amount <= maxBorrow);

        // TODO
        // uint256 availableForNext = maxBorrow > debt ? maxBorrow - debt : 0;
        // if (availableForNext < _loan._amount) revert InvalidInput();

        /// AT THIS POINT THE LOAN SHOULD BE 100% VALIDATED.


        /// @dev FIND the first available loan id, or revert.
        _assignNewLoanTo(user, loanId); // Revert if the max number of loans.
        loans[loanId] = newLoan;
        _activeUsers.add(msg.sender);
        
        /// @dev refers to the original amount loaned, before interest is added.
        loanPrincipal += newLoan.amount;

        // lock assets
        _lockCollateral(user, newLoan);

        /// TODO
        // doTransferOut(asset(), owner, newLoan.amount); // send pesos
    }


    function _validateLoan(Loan memory _loan) internal view {
        if (_loan.amount <= availableAsset) revert NotEnoughLiquidity();

        if (_loan.amount > MAX_CREDIT_AMOUNT) revert InvalidLoanAmount();
        if (_loan.amount < MIN_CREDIT_AMOUNT) revert InvalidLoanAmount();

        if (_loan.installments > MAX_INSTALLMENTS) revert InvalidLoanInstallments();
        if (_loan.installments < MIN_INSTALLMENTS) revert InvalidLoanInstallments();

        require(_loan.intervalDuration() >= MAX_TIME_BETWEEN_INSTALLS); /// check after updating the value.

        if (_loan.apy > MAX_APY_BP) revert InvalidLoanAPY();
        if (_loan.apy < MIN_APY_BP) revert InvalidLoanAPY();

        if (_loan.duration > MAX_DURATION) revert InvalidLoanDuration();
        if (_loan.duration < MIN_DURATION) revert InvalidLoanDuration();

        /// TODO: CHECK A RELATION BETWEEN APY AND DURATION + TOTAL_LIQUIDITY.

    }

    function _loanProgress(Loan memory _loan) internal view returns (uint256) {
        if (_loan.createdAt <= block.timestamp) return 0;

        uint256 loanEnds = _loan.createdAt + _loan.duration;
        if (block.timestamp < loanEnds) {
            uint256 elapsedTime = block.timestamp - _loan.createdAt;
            return elapsedTime.mulDiv(10**18, _loan.duration);
        }
        return 10**18; // 100%
        
    }



    function _removeDecimals(uint256 _payment) internal returns (uint256) {
        return (_payment / 10 ** decimals()) * 10 ** decimals();
    }

    /// @return 0 if the first installment isn't due.
    ///         1 at this point, totalPayment >= payment * 1;
    ///         2 at this point, totalPayment >= payment * 2;
    ///         if n == (_loan.installments - 1) last installment must cover amount + amountInterest + PENALTY; to unlock the collateral.
    function _getCurrentInstallment(Loan memory _loan) internal view returns (uint256) {
        for (uint i = 1; i < _loan.installments; i++) {
            if (block.timestamp <= _loan.createdAt + (_loan.intervalDuration() * i)) {
                return i;
            }
        }
        return _loan.installments;
    }

    /// @dev this function consider different scenarios, using the block.timestamp.
    function _loanDebt(Loan memory _loan) internal view returns (LoanDebtStatus memory _status) {
        uint256 today = block.timestamp;
        uint256 intervalDuration = _loan.intervalDuration();

        // Loan Grand Debt.
        uint256 grandDebt = _loan.grandDebt();

        // Last payment must be for the total debt.
        uint256 payment = grandDebt.mulDiv(1, _loan.installments, Math.Rounding.Floor);
        /// TODO: It could be nice if the payment is softly rounded.
        // payment = _removeDecimals(payment);

        uint256 whereAmI = _getCurrentInstallment(_loan);

        console.log("today: ", today);
        console.log("intervalDuration: ", intervalDuration);
        console.log("grandDebt: ", grandDebt);
        console.log("payment: ", payment);
        console.log("whereAmI: ", whereAmI);

        uint256 totalDebt;

        if (whereAmI == 0) {
            return LoanDebtStatus(
                0,
                payment + FIXED_LOAN_FEE,
                _loan.amount - _loan.totalPayment
            );
        } else if (whereAmI == _loan.installments) { // TODO: do I have to (- 1)? we are the last
            // uint256 maturedDebt = FIXED_LOAN_FEE + (_loan.installments - 1) * paymen
            totalDebt = FIXED_LOAN_FEE + grandDebt;
            uint256 remainingDebt = totalDebt - _loan.totalPayment;
            return LoanDebtStatus({
                maturedDebt: _loan.totalPayment == totalDebt ? 0 : remainingDebt,
                nextInstallment: _loan.totalPayment >= totalDebt ? 0 : totalDebt,
                remainingDebt
            });
        } else {
            totalDebt = FIXED_LOAN_FEE + grandDebt;
            return LoanDebtStatus({
                maturedDebt: _loan.totalPayment >= payment * whereAmI ? 0 : totalDebt,
                nextInstallment: _loan.totalPayment >= totalDebt ? 0 : totalDebt,
                remainingDebt: _loan.totalPayment >= totalDebt ? 0 : totalDebt
            });
        }
    }

    function pay(uint256 _amount, uint256 _loanId) external {
        Loan storage loan = loans[_loanId];

        // uint256 loanProgress = loan.

        doTransferIn(asset(), msg.sender, _amount);

        // coverInstallment(loan, _amount);

    }

    function converInstallment(Loan storage _loan, uint256 _amount) internal {

        uint256 totalPayment = _loan.totalPayment + _amount;
        // do not pay more than the credit.
        require(totalPayment <= _loan.amount);


        _loan.totalPayment += _amount;
        
    }

    

    function _convertToLoan(LoanForm memory _loanForm, address _owner) internal view returns (Loan memory _loan) {
        _loan = Loan({
            owner: _owner,
            amount: _loanForm.amount,
            totalPayment: 0,
            installments: _loanForm.installments,
            apy: _loanForm.apy,
            createdAt: block.timestamp,
            duration: _loanForm.duration,
            attachedCollateral: _loanForm.attachedCollateral
        });
        _validateLoan(_loan);
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

    function _createNewLoan(uint256 _newLoanId, LoanForm memory _form, address owner) internal{


    }

    function _lockCollateral(User storage _user, Loan memory _loan) private {
        require(_user.balanceCollat >= _loan.attachedCollateral);
        _user.balanceCollat -= _loan.attachedCollateral;
    }

    // function getUserDebt(address _account) public returns (uint256) {
    //     users[_account].debt;
    // }


    /// @dev The price in base asset pesos, of the collateral (mpETH).
    function fromETHtoPeso(uint256 _amount) internal returns (uint256 _price) {
        _price = _amount.mulDiv(10000, 1);
    }



    function doTransferIn(address _asset, address _from, uint256 _amount) private {
        IERC20(_asset).safeTransferFrom(_from, address(this), _amount);
    }

    function doTransferOut(address _asset, address _to, uint256 _amount) private {
        IERC20(_asset).safeTransfer(_to, _amount);
    }


}
