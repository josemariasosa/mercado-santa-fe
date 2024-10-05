// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/// Oracle https://www.pyth.network/price-feeds/fx-usd-mxn?cluster=pythtest-crosschain&range=1M

contract USDToMXNOracle {

    int256 constant private basePrice = 1927990000; // price at 2024-10-05
    uint16 public decrease;
    uint16 public increment;
    uint16 constant private BASIS_POINTS = 100_00;

    function decimals() external pure returns (uint8) {
        return 8;
    }

    function description() external pure returns (string memory) {
        return "USD / MXN";
    }

    function version() external pure returns (uint256) {
        return 1;
    }

    function decreasePrice(uint16 _byPercent) external {
        decrease += _byPercent;
    }

    function increasePrice(uint16 _byPercent) external {
        increment += _byPercent;
    }

    function reset() external {
        decrease = 0;
        increment = 0;
    }

    function getPrice() internal view returns (int256) {
        // Cast increment and decrease to uint256 first, then to int256
        int256 intIncrement = int256(uint256(increment));
        int256 intDecrease = int256(uint256(decrease));

        return basePrice
            * (int256(uint256(BASIS_POINTS)) + intIncrement - intDecrease)
            / int256(uint256(BASIS_POINTS));
    }

    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (
            18446744073709563840,
            getPrice(),
            1714426368,
            1714426368,
            18446744073709563840
        );
    }
}