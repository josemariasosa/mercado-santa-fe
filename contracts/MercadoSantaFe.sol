// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";


uint256 constant MAX_LOANS_BY_USER = 3;

/// @param loanIds IMPORTANT: 3 is the max loans for user. LoanId == 0 means, no loan at all.
struct User {
    uint256 balanceCollat;
    // uint256 debt; // debt is always changing.
    uint256[MAX_LOANS_BY_USER] loanIds;
}

struct Loan {
    address owner;
    /// @dev amount and totalPayment are denominated in pesos.
    uint256 amount;
    uint256 totalPayment;

    uint8 installments; // cuantos abonos?
    uint16 apy;         // as basis point 100% == 100_00
    uint256 createdAt;    // unix timestamp
    uint32 duration;    // in seconds

    uint256 attachedCollateral;
}

library LoanLib {

    using Math for uint256;

    uint32 private constant MAX_TIME_BETWEEN_INSTALLS = (4 * 1 weeks); // aprox 1 month.
    uint16 private constant BASIS_POINTS = 100_00; // 100.00%

    /// @dev should revert if the interval is invalid.
    function intervalDuration(Loan memory _self) internal view returns (uint256 _intervalDuration) {
        _intervalDuration = uint256(_self.duration).mulDiv(1, _self.installments, Math.Rounding.Ceil);
        require(_intervalDuration >= MAX_TIME_BETWEEN_INSTALLS); /// check after updating the value.
    }

    /// Loan Total Grand Debt.
    function grandDebt(Loan memory _self) internal view returns (uint256) {
        return _self.amount.mulDiv(_self.apy, BASIS_POINTS, Math.Rounding.Ceil);
    }

    function isFullyPaid(Loan memory _self) internal view returns (bool) {
        return grandDebt(_self) == _self.totalPayment;
    }
}

struct LoanForm {
    uint256 amount;
    uint8 installments;  // cuantos abonos?
    uint16 apy;         // as basis point 100% == 100_00
    uint32 duration;    // in seconds
    uint256 attachedCollateral;
}

/// CDP collateral debt possition

/// @title Mercado Santa Fe - Collateralize asset A and get asset B credits.
/// Lend asset B and get APY on asset B or, in liquidations, in collateral.
/// @author Centauri devs team
contract MercadoSantaFe is ERC4626 {

    using SafeERC20 for IERC20;
    using Math for uint256;
    using EnumerableSet for EnumerableSet.AddressSet;
    using LoanLib for Loan;

    /// Constants -----------------------------------------------------------------------

    uint16 private constant BASIS_POINTS = 100_00; // 100.00%

    address public immutable collateral;   // immutable
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

    /// Storage -------------------------------------------------------------------------

    EnumerableSet.AddressSet private _activeUsers; /// addresses with an active Loan

    uint256 public nextLoanId;

    /// @dev An account cannot have less than minCollateralAmount in vault;
    uint256 public minCollateralAmount;

    /// @dev Collateral, and all sort of good User stuff. user => balance
    mapping (address => User) public users;

    mapping (uint256 => Loan) public loans;


    uint256 public availableAsset; // ready to be borrowed.
    uint256 public totalInCDP;     // lock in a loan, in pesos

    /// Errors & events ---

    event Withdrawal(uint amount, uint when);

    error InvalidCollateral(address _token);
    error InvalidInput();
    error NotEnoughBalance();
    error DoNotLeaveDust(uint256 _change);
    error NotEnoughLiquidity();

    constructor(
        address _collateral,
        address _asset // pesos
    ) ERC4626(IERC20(_asset)) ERC20("Mercado: mpETH <> XOC alphaV1", "MSF0001") {
        collateral = _collateral;

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

    function totalAssets() public view override returns (uint256) {
        return availableAsset + totalInCDP;
    }

    /// Lending Pesos -------------------------------------------------------------------

    /** @dev See {IERC4626-deposit}. */
    function deposit(uint256 assets, address receiver) public override returns (uint256) {
        uint256 maxAssets = maxDeposit(receiver);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxDeposit(receiver, assets, maxAssets);
        }

        uint256 shares = previewDeposit(assets);
        _deposit(_msgSender(), receiver, assets, shares);

        return shares;
    }

    /** @dev See {IERC4626-mint}. */
    function mint(uint256 shares, address receiver) public override returns (uint256) {
        uint256 maxShares = maxMint(receiver);
        if (shares > maxShares) {
            revert ERC4626ExceededMaxMint(receiver, shares, maxShares);
        }

        uint256 assets = previewMint(shares);
        _deposit(_msgSender(), receiver, assets, shares);

        return assets;
    }

    /// @dev Deposit/mint common workflow.
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override {
        // If _asset is ERC-777, `transferFrom` can trigger a reentrancy BEFORE the transfer happens through the
        // `tokensToSend` hook. On the other hand, the `tokenReceived` hook, that is triggered after the transfer,
        // calls the vault, which is assumed not malicious.
        //
        // Conclusion: we need to do the transfer before we mint so that any reentrancy would happen before the
        // assets are transferred and before the shares are minted, which is a valid state.
        // slither-disable-next-line reentrancy-no-eth
        SafeERC20.safeTransferFrom(IERC20(asset()), caller, address(this), assets);
        _mint(receiver, shares);

        /// updating global state.
        availableAsset += assets;

        emit Deposit(caller, receiver, assets, shares);
    }

    // withdraw is never that simple !
    // /// @dev Withdraw/redeem common workflow.
    // function _withdraw(
    //     address caller,
    //     address receiver,
    //     address owner,
    //     uint256 assets,
    //     uint256 shares
    // ) internal override {
    //     if (caller != owner) {
    //         _spendAllowance(owner, caller, shares);
    //     }

    //     // If _asset is ERC-777, `transfer` can trigger a reentrancy AFTER the transfer happens through the
    //     // `tokensReceived` hook. On the other hand, the `tokensToSend` hook, that is triggered before the transfer,
    //     // calls the vault, which is assumed not malicious.
    //     //
    //     // Conclusion: we need to do the transfer after the burn so that any reentrancy would happen after the
    //     // shares are burned and after the assets are transferred, which is a valid state.
    //     _burn(owner, shares);
    //     SafeERC20.safeTransfer(_asset, receiver, assets);

    //     emit Withdraw(caller, receiver, owner, assets, shares);
    // }

    //     /** @dev See {IERC4626-withdraw}. */
    // function withdraw(uint256 assets, address receiver, address owner) public override returns (uint256) {
    //     uint256 maxAssets = maxWithdraw(owner);
    //     if (assets > maxAssets) {
    //         revert ERC4626ExceededMaxWithdraw(owner, assets, maxAssets);
    //     }

    //     uint256 shares = previewWithdraw(assets);
    //     _withdraw(_msgSender(), receiver, owner, assets, shares);

    //     return shares;
    // }

    // /** @dev See {IERC4626-redeem}. */
    // function redeem(uint256 shares, address receiver, address owner) public override returns (uint256) {
    //     uint256 maxShares = maxRedeem(owner);
    //     if (shares > maxShares) {
    //         revert ERC4626ExceededMaxRedeem(owner, shares, maxShares);
    //     }

    //     uint256 assets = previewRedeem(shares);
    //     _withdraw(_msgSender(), receiver, owner, assets, shares);

    //     return assets;
    // }

    /// Collateral | Borrowing Pesos ----------------------------------------------------

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


    modifier strictValidation(LoanForm memory _loan) {
        if (_loan.amount <= availableAsset) revert NotEnoughLiquidity();

        if (_loan.amount > MAX_CREDIT_AMOUNT) revert InvalidInput();
        if (_loan.amount < MIN_CREDIT_AMOUNT) revert InvalidInput();

        if (_loan.installments > MAX_INSTALLMENTS) revert InvalidInput();
        if (_loan.installments < MIN_INSTALLMENTS) revert InvalidInput();

        // if (_loan._duration / _loan.installments > MAX_TIME_BETWEEN_INSTALLS) revert InvalidInput();
        // _loan.intervalDuration();

        if (_loan.apy > MAX_APY_BP) revert InvalidInput();
        if (_loan.apy < MIN_APY_BP) revert InvalidInput();

        if (_loan.duration > MAX_DURATION) revert InvalidInput();
        if (_loan.duration < MIN_DURATION) revert InvalidInput();

        /// TODO: CHECK A RELATION BETWEEN APY AND DURATION + TOTAL_LIQUIDITY.

        _;
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

    /// @param maturedDebt – implies the debt has reached its due date.
    /// @param nextInstallment – focuses on the fact that this is the next payment to be made.
    /// @param remainingDebt – clearly conveys that this is what’s left after payments.
    struct LoanDebtStatus {
        uint256 maturedDebt; // in pesos
        uint256 nextInstallment; // in pesos
        uint256 remainingDebt; // in pesos
    }

    function _removeDecimals(uint256 _payment) internal returns (uint256) {
        return (_payment / 10 ** decimals()) * 10 ** decimals();
    }

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

        if (whereAmI == 0) {
            return LoanDebtStatus(
                FIXED_LOAN_FEE,
                payment,
                _loan.amount - _loan.totalPayment
            );
        } else if (whereAmI == _loan.installments) {
            // uint256 maturedDebt = FIXED_LOAN_FEE + (_loan.installments - 1) * paymen
            return LoanDebtStatus({
                /// TODO
                maturedDebt: _loan.totalPayment == FIXED_LOAN_FEE + grandDebt ? 0 : FIXED_LOAN_FEE + grandDebt,
                nextInstallment: _loan.totalPayment >= FIXED_LOAN_FEE + grandDebt ? 0 : FIXED_LOAN_FEE + grandDebt,
                remainingDebt: _loan.totalPayment >= FIXED_LOAN_FEE + grandDebt ? 0 : FIXED_LOAN_FEE + grandDebt
            });
        } else {
            return LoanDebtStatus({
                /// TODO
                maturedDebt: _loan.totalPayment >= FIXED_LOAN_FEE + grandDebt ? 0 : FIXED_LOAN_FEE + grandDebt,
                nextInstallment: _loan.totalPayment >= FIXED_LOAN_FEE + grandDebt ? 0 : FIXED_LOAN_FEE + grandDebt,
                remainingDebt: _loan.totalPayment >= FIXED_LOAN_FEE + grandDebt ? 0 : FIXED_LOAN_FEE + grandDebt
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

    function borrow(LoanForm memory _loan) external strictValidation(_loan) {

        uint256 userCollat = users[msg.sender].balanceCollat;

        uint256 collateralTotalValue = fromETHtoPeso(userCollat);
        uint256 maxBorrow = collateralTotalValue.mulDiv(85_00, 100_00); // LTV

        // uint256 debt = users[msg.sender].debt;

        // uint256 availableForNext = maxBorrow > debt ? maxBorrow - debt : 0;

        // if (availableForNext < _loan._amount) revert InvalidInput();

        /// AT THIS POINT THE LOAN SHOULD BE 100% VALIDATED.
        
        _createNewLoan(nextLoanId, _loan, msg.sender);




    }

    function convertToLoan(LoanForm memory loanForm, address owner) public view returns (Loan memory) {
        return Loan({
            owner: owner,
            amount: loanForm.amount,
            totalPayment: 0,
            installments: loanForm.installments,
            apy: loanForm.apy,
            createdAt: block.timestamp,
            duration: loanForm.duration,
            attachedCollateral: loanForm.attachedCollateral
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
        revert InvalidInput();
    }

    function _createNewLoan(uint256 _newLoanId, LoanForm memory _form, address owner) internal {
        User storage user = users[owner];


        Loan memory newLoan = convertToLoan(_form, owner);

        loans[_newLoanId] = newLoan;

        /// FIND the first available loan id
        // if (_getUserActiveLoans(user) == MAX_LOANS_BY_USER) revert InvalidInput(); // no new loans for owner
        _assignNewLoanTo(user, _newLoanId); // see code line above

        _activeUsers.add(owner);

        // lock assets
        _lockCollateral(user, newLoan);

        doTransferOut(asset(), owner, newLoan.amount); // send pesos

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
