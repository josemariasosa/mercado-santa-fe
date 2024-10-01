// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {MercadoSantaFe} from "../MercadoSantaFe.sol";

///@notice DO NOT DEPLOY. Contract only for testing purposes.
contract MercadoSantaFeHarness is MercadoSantaFe {
    constructor(
        address _collateral,
        address _asset
    ) MercadoSantaFe(
        _collateral,
        _asset
    ) {}
}