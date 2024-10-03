// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

interface IBodegaDeChocolates is IERC4626 {
    function availableAsset() external view returns (uint256);
}