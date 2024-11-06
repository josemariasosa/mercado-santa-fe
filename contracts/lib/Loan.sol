// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// Uncomment this line to use console.log
import "hardhat/console.sol";

struct Loan {
    address owner;
    /// @dev amount and totalPayment are denominated in pesos.
    uint256 loanAmount;

    uint256 debtAmount;

    /// @dev totalPayment should NEVER be greater than debtAmount.
    uint256 totalPayment;

    /// @dev Number of payments the owner will have to do.
    uint8 installments;

    /// @dev As basis point 69.70% == 69_70
    uint16 apy;

    /// @dev Unix timestamp in seconds.
    uint256 createdAt;
    uint32 duration;

    uint256 attachedCollateral;
}

library LoanLib {

    using Math for uint256;

    uint16 private constant BASIS_POINTS = 100_00; // 100.00%

    ///@dev the most common term for a time extension allowed after the due date.
    uint256 private constant GRACE_PERIOD = 5 days; // 5 natural days

    /// @dev should revert if the interval is invalid.
    function intervalDuration(Loan memory _self) internal pure returns (uint256 _intervalDuration) {
        _intervalDuration = uint256(_self.duration).mulDiv(1, _self.installments, Math.Rounding.Ceil);
    }

    /// @dev Debt without the penalty.
    function getTotalDebt (
        uint256 _apy,
        uint256 _fixedLoanFee,
        uint256 _loanAmount
    ) internal pure returns (uint256 _debt) {
        uint256 withInterest = _loanAmount.mulDiv(
            BASIS_POINTS + _apy,
            BASIS_POINTS,
            Math.Rounding.Ceil
        );
        if (withInterest > 0) _debt = _fixedLoanFee + withInterest;
    }

    /// Loan Total Grand Debt.
    function grandDebt(
        Loan memory _self,
        uint16 _penaltyBp
    ) internal view returns (uint256 _debt) {
        if (isLate(_self)) {
            uint256 penalty = _self.debtAmount.mulDiv(_penaltyBp, BASIS_POINTS, Math.Rounding.Ceil);
            _debt = _self.debtAmount + penalty;
        } else {
            _debt = _self.debtAmount;
        }
    }

    function isLate(Loan memory _self) internal view returns (bool) {
        return !isFullyPaid(_self) && block.timestamp > _self.createdAt + _self.duration;
    }

    function isOverdue(Loan memory _self) internal view returns (bool) {
        return !isFullyPaid(_self) && block.timestamp - GRACE_PERIOD > _self.createdAt + _self.duration;
    }

    function isFullyPaid(Loan memory _self) internal pure returns (bool) {
        return _self.debtAmount == _self.totalPayment;
    }

    /// @return 0 if the first installment isn't due.
    ///         1 at this point, totalPayment >= payment * 1;
    ///         2 at this point, totalPayment >= payment * 2;
    ///         if n == (_loan.installments - 1)
    ///         last installment must cover amount + amountInterest + PENALTY; to unlock the collateral.
    function getInstallment(Loan memory _self) internal view returns (uint256) {
        // console.log("block.timestamp: ", block.timestamp);
        // console.log("self.createdAt : ", _self.createdAt);
        for (uint i = 0; i < _self.installments; i++) {
            // console.log("-----> ", i);
            // console.log("-----> ", _self.createdAt + (intervalDuration(_self) * i + 1));
            // console.log("**************************");
            if (block.timestamp <= _self.createdAt + (intervalDuration(_self) * (i + 1))) {
                return i;
            }
        }
        return _self.installments;
    }
}

struct LoanForm {
    uint256 amount;
    uint8 installments;     // cuantos abonos?
    uint32 duration;        // in seconds
    uint256 attachedCollateral;
}

/// @param maturedDebt implies the debt has reached its due date.
/// @param nextInstallment focuses on the fact that this is the next payment to be made.
/// @param remainingDebt clearly conveys that this is what’s left after payments.
struct LoanDebtStatus {
    uint256 maturedDebt;     // all amounts are in pesos
    uint256 nextInstallment;
    uint256 remainingDebt;
}