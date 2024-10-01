// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

///@notice DO NOT DEPLOY. Contract only for testing purposes.
contract MPETHToken is ERC20 {
    constructor() ERC20("MetaPoolETH", "mpETH") {}

    function allocateTo(address _receiver, uint256 _amount) public {
        _mint(_receiver, _amount);
    }
}