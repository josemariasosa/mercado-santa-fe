// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IMetaPoolETH} from "./interfaces/IMetaPoolETH.sol";

///@notice DO NOT DEPLOY. Contract only for testing purposes.
contract MetaPoolETH is ERC20, IMetaPoolETH {
    uint256 constant private MPETH_PRICE = 1_718_731_415;

    bool public staticPrice;

    error NotStaticPrice();

    constructor(bool _staticPrice) ERC20("MetaPoolETH", "mpETH") {
        staticPrice = _staticPrice;
    }

    function allocateTo(address _receiver, uint256 _amount) public {
        _mint(_receiver, _amount);
    }

    function getStaticPrice() public view returns (uint256) {
        if (!staticPrice) revert NotStaticPrice();
        return convertToAssets(1 ether);
    }

    /// @notice 1 mpETH -> 1.714757828 ETH price increase with the block timestamp
    function convertToAssets(uint256 _shares) public view returns (uint256) {
        return _shares * (staticPrice ? MPETH_PRICE : block.timestamp) / (10 ** 9);
    }

    /// @notice 1 mpETH -> 1.714757828 ETH price increase with the block timestamp
    function convertToShares(uint256 _assets) public view returns (uint256) {
        return _assets * (10 ** 9) / (staticPrice ? MPETH_PRICE : block.timestamp);
    }
}