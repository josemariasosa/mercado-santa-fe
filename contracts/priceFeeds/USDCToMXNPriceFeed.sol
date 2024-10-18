// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {AggregatorV3Interface} from "../vendor/interfaces/AggregatorV3Interface.sol";
import {IPriceFeed} from "../interfaces/IPriceFeed.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// IMPORTANT: USD to MXN price:
/// Oracle https://www.pyth.network/price-feeds/fx-usd-mxn?cluster=pythtest-crosschain&range=1M

/// @title USDC to MXN price feed
/// @notice A custom price feed that calculates the price for USDC / MXN
/// @author Centauri devs team ✨
contract USDCToMXNPriceFeed is IPriceFeed {

    using Math for uint256;

    /** Custom errors **/
    error BadDecimals();
    error InvalidInt256();
    error NegativeNumber();

    /// @notice Version of the price feed
    uint256 public constant version = 1;

    /// @notice Description of the price feed
    string public constant description = "Custom price feed for USDC / MXN";

    /// @notice Number of decimals for returned prices
    uint8 public constant override decimals = 8;

    /// @notice Chainlink USDC / USD price feed
    AggregatorV3Interface public immutable USDCToUSDPriceFeed;

    /// @notice Pyth USD / MXN price feed
    AggregatorV3Interface public immutable USDToMXNPriceFeed;

    /// @notice USDC token address
    address public immutable usdc;

    /// @notice Construct a new USDC / USD price feed
    /// @param _USDCToUSDPriceFeed The address of the USDC / USD price feed to fetch prices
    /// @param _USDToMXNPriceFeed The address of the USDC / USD price feed to fetch prices
    constructor(address _USDCToUSDPriceFeed, address _USDToMXNPriceFeed) {
        USDCToUSDPriceFeed = AggregatorV3Interface(_USDCToUSDPriceFeed);
        USDToMXNPriceFeed = AggregatorV3Interface(_USDToMXNPriceFeed);
    }

    /// @notice USDC price for the latest round
    /// @return roundId Round id from the USDC / USD price feed
    /// @return answer Latest price for USDC / MXN
    /// @return startedAt Timestamp when the round was started; passed on from the USDC / USD price feed
    /// @return updatedAt Timestamp when the round was last updated; passed on from the USDC / USD price feed
    /// @return answeredInRound Round id in which the answer was computed; passed on from the USDC / USD price feed
    function latestRoundData() override external view returns (uint80, int256, uint256, uint256, uint80) {
        (
            uint80 _roundId,
            int256 _USDCToUSDPrice,
            uint256 _startedAt,
            uint256 _updatedAt,
            uint80 _answeredInRound
        ) = USDCToUSDPriceFeed.latestRoundData();

        (, int256 _USDToMXNPrice,,,) = USDToMXNPriceFeed.latestRoundData();

        uint256 price = unsigned256(_USDCToUSDPrice).mulDiv(
            unsigned256(_USDToMXNPrice),
            10 ** decimals,
            Math.Rounding.Floor
        );

        return (
            _roundId,
            signed256(price),
            _startedAt,
            _updatedAt,
            _answeredInRound
        );
    }

    function signed256(uint256 n) internal pure returns (int256) {
        if (n > uint256(type(int256).max)) revert InvalidInt256();
        return int256(n);
    }

    function unsigned256(int256 n) internal pure returns (uint256) {
        if (n < 0) revert NegativeNumber();
        return uint256(n);
    }
}
