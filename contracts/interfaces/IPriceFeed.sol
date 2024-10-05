// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/// @dev Interface for price feed
/// @notice This is Chainlink's AggregatorV3Interface, but without the `getRoundData` function.
interface IPriceFeed {
    function decimals() external view returns (uint8);

    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}