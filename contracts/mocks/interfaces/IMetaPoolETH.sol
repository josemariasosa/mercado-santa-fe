// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/// @dev Interface for the Meta Pool ETH token.
interface IMetaPoolETH {
    function convertToAssets(uint256 _shares) external view returns (uint256);
    function convertToShares(uint256 _assets) external view returns (uint256);
}