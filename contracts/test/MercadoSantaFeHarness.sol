// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {MercadoSantaFe, Loan, LoanDebtStatus} from "../MercadoSantaFe.sol";

///@notice DO NOT DEPLOY. Contract only for testing purposes.
contract MercadoSantaFeHarness is MercadoSantaFe {
    constructor(
        address _collateral,
        address _asset
    ) MercadoSantaFe(
        _collateral,
        _asset
    ) {}

    function test__loanDebt(Loan memory _loan) external view returns (LoanDebtStatus memory _status) {
        return _loanDebt(_loan);
    }

    function test__getNow() external view returns (uint256) {
        return block.timestamp;
    }

    function test__validateLoan(Loan memory _loan) external view {
        return  _validateLoan(_loan);
    }
}