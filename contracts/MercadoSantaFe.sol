// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// Uncomment this line to use console.log
// import "hardhat/console.sol";

/// CDP collateral debt possition

/// @title Mercado Santa Fe - Collateralize asset A and get asset B credit.
/// Lend asset B and get APY on asset B or, in liquidations, with collateral.
/// @author Centauri devs team
contract MercadoSantaFe {

    using SafeERC20 for IERC20;

    /// Constants ---

    address public immutable collateral;   // immutable
    address public immutable creditAsset ; // immutable


    /// Storage ---

    /// @dev An account cannot have less than minCollateralAmount in vault;
    uint256 public minCollateralAmount;

    /// @dev Collateral user => balance
    mapping (address => uint256) public balances;

    mapping (IERC20 => bool) public validCollateral;

    /// Errors & events ---

    event Withdrawal(uint amount, uint when);

    error InvalidCollateral(address _token);
    error InvalidInput();
    error NotEnoughBalance();
    error DoNotLeaveDust(change)

    constructor(address _collateral, address _creditAsset) {
        creditAsset = _creditAsset;
        collateral = _collateral;
    }

    /// Deposit
    /// Withdraw and withdrawAll
    /// 

    function depositCollateral(address _to, uint256 _amount) external {
        if (_to == address(0)) revert InvalidInput();
        if (_amount < minCollateralAmount) revert InvalidInput();

        doTransferIn(collateral, msg.sender, _amount);
        balances[_to] += _amount;
    }

    function withdrawCollateral(uint256 _amount) external {
        if (_amount == 0) revert InvalidInput();
        uint256 balance = balances[msg.sender];

        if (_amount > balance) revert NotEnoughBalance();
        uint256 change = balance - _amount;

        if (change < minCollateralAmount) revert DoNotLeaveDust(change);
        balances[msg.sender] = change;
        doTransferOut(collateral, msg.sender, _amount);
    }

    function withdrawAll() external {
        uint256 amountCollat = balances[msg.sender];
        if (amountCollat == 0) revert NotEnoughBalance();

        balances[msg.sender] = 0;
        doTransferOut(collateral, msg.sender, _amount);
    }

    /// @param _amount is denominated in 
    function borrow(uint256 _amount) external {

    }





    function _assertValidToken(IERC20 _token) private {
        if (!validCollateral[_token]) revert InvalidCollateral(address(_token));
    }

    function doTransferIn(address _asset, address _from, uint256 _amount) private {
        IERC20(_asset).safeTransferFrom(_from, address(this), _amount);
    }

    function doTransferOut(address _asset, address _to, uint256 _amount) private {
        IERC20(_asset).safeTransfer(_to, _amount);
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
