// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract CollateralEngine {

    using SafeERC20 for IERC20;

    address public collateral; // immutable

    // user => balance
    mapping (address => uint256) public balances;

    mapping (IERC20 => bool) public validCollateral;

    event Withdrawal(uint amount, uint when);

    error InvalidCollateral(address _token);

    constructor(address _collateral) {
        collateral = _collateral;
    }

    function depositCollateral(address _to, uint256 _amount) external {

        doTransferIn(collateral, msg.sender, _amount);

        balances[_to] += _amount;

    }

    function _assertValidToken(IERC20 _token) private {
        if (!validCollateral[_token]) revert InvalidCollateral(address(_token));
    }

    function doTransferIn(address _asset, address _from, uint256 _amount) private {
        IERC20(_asset).safeTransferFrom(_from, address(this), _amount);
    }

    function withdraw() public {
        // Uncomment this line, and the import of "hardhat/console.sol", to print a log in your terminal
        // console.log("Unlock time is %o and block timestamp is %o", unlockTime, block.timestamp);

        require(block.timestamp >= unlockTime, "You can't withdraw yet");
        require(msg.sender == owner, "You aren't the owner");

        emit Withdrawal(address(this).balance, block.timestamp);

        owner.transfer(address(this).balance);
    }
}
