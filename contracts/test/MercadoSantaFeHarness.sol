// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {MercadoSantaFe, Loan, LoanDebtStatus} from "../MercadoSantaFe.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IBodegaDeChocolates} from "../interfaces/IBodegaDeChocolates.sol";
import {IPriceFeed} from "../interfaces/IPriceFeed.sol";

///@notice DO NOT DEPLOY. Contract only for testing purposes.
contract MercadoSantaFeHarness is MercadoSantaFe {
    constructor(
        IERC20 _collateral,
        IBodegaDeChocolates _bodega,
        IPriceFeed _collatToPesosOracle
    ) MercadoSantaFe(
        _collateral,
        _bodega,
        _collatToPesosOracle
    ) {}

    function test__loanDebtStatus(Loan memory _loan) external view returns (LoanDebtStatus memory _status) {
        return _loanDebtStatus(_loan);
    }

    function test__getNow() external view returns (uint256) {
        return block.timestamp;
    }

    function test__validateLoan(Loan memory _loan) external view {
        return  _validateLoan(_loan);
    }
}