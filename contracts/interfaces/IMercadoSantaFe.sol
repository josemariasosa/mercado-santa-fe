// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

interface IMercadoSantaFe {
    function totalDeployedInLoans() external view returns (uint256);
    function collateral() external view returns (address);
    function fromCollatToPesos(uint256 _amount) external view returns (uint256);
}