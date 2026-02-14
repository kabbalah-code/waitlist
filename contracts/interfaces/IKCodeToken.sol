// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IKCodeToken is IERC20 {
    function addGamePoints(address user, uint256 points) external;
    function convertPointsToTokens(uint256 points) external;
    function mintGameRewards(address to, uint256 amount) external;
    function stake(uint256 amount) external;
    function unstake(uint256 amount) external;
    function claimRewards() external;
    function getPendingRewards(address user) external view returns (uint256);
    function gamePoints(address user) external view returns (uint256);
}