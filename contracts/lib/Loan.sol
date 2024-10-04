// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

struct Loan {
    address owner;
    /// @dev amount and totalPayment are denominated in pesos.
    uint256 amount;
    uint256 totalPayment;

    uint8 installments; // cuantos abonos?
    uint16 apy;         // as basis point 100% == 100_00
    uint256 createdAt;  // unix timestamp
    uint32 duration;    // in seconds

    uint256 attachedCollateral;
}

library LoanLib {

    using Math for uint256;

    uint16 private constant BASIS_POINTS = 100_00; // 100.00%

    /// @dev should revert if the interval is invalid.
    function intervalDuration(Loan memory _self) internal pure returns (uint256 _intervalDuration) {
        _intervalDuration = uint256(_self.duration).mulDiv(1, _self.installments, Math.Rounding.Ceil);
    }

    /// Loan Total Grand Debt.
    function grandDebt(Loan memory _self) internal pure returns (uint256) {
        return _self.amount.mulDiv(BASIS_POINTS + _self.apy, BASIS_POINTS, Math.Rounding.Ceil);
    }

    function isFullyPaid(Loan memory _self) internal pure returns (bool) {
        return grandDebt(_self) == _self.totalPayment;
    }

    /// @return 0 if the first installment isn't due.
    ///         1 at this point, totalPayment >= payment * 1;
    ///         2 at this point, totalPayment >= payment * 2;
    ///         if n == (_loan.installments - 1)
    ///         last installment must cover amount + amountInterest + PENALTY; to unlock the collateral.
    function getInstallment(Loan memory _self) internal view returns (uint256) {
        for (uint i = 0; i < _self.installments; i++) {
            if (block.timestamp <= _self.createdAt + (intervalDuration(_self) * i + 1)) {
                return i;
            }
        }
        return _self.installments;
    }
}

struct LoanForm {
    uint256 amount;
    uint8 installments;  // cuantos abonos?
    uint16 apy;         // as basis point 100% == 100_00
    uint32 duration;    // in seconds
    uint256 attachedCollateral;
}

/// @param maturedDebt – implies the debt has reached its due date.
/// @param nextInstallment – focuses on the fact that this is the next payment to be made.
/// @param remainingDebt – clearly conveys that this is what’s left after payments.
struct LoanDebtStatus {
    uint256 maturedDebt; // in pesos
    uint256 nextInstallment; // in pesos
    uint256 remainingDebt; // in pesos
}