// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TeamVesting
 * @dev Vesting contract for team tokens with cliff and linear release
 */
contract TeamVesting is Ownable, ReentrancyGuard {
    
    IERC20 public immutable kCodeToken;
    
    struct VestingSchedule {
        address beneficiary;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 vestingDuration;
        bool revoked;
    }
    
    mapping(address => VestingSchedule) public vestingSchedules;
    address[] public beneficiaries;
    
    uint256 public totalVestedAmount;
    uint256 public totalReleasedAmount;
    
    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration
    );
    
    event TokensReleased(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary, uint256 unvestedAmount);
    
    constructor(address _kCodeToken, address initialOwner) Ownable(initialOwner) {
        require(_kCodeToken != address(0), "Invalid token address");
        kCodeToken = IERC20(_kCodeToken);
    }
    
    /**
     * @dev Create vesting schedule for team member
     * @param beneficiary Address of team member
     * @param totalAmount Total tokens to vest
     * @param startTime When vesting starts (timestamp)
     * @param cliffDuration Cliff period in seconds (e.g., 6 months)
     * @param vestingDuration Total vesting period in seconds (e.g., 36 months)
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration
    ) external onlyOwner {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(totalAmount > 0, "Amount must be positive");
        require(vestingDuration > cliffDuration, "Vesting duration must be longer than cliff");
        require(vestingSchedules[beneficiary].totalAmount == 0, "Schedule already exists");
        
        // Check if contract has enough tokens
        uint256 contractBalance = kCodeToken.balanceOf(address(this));
        require(contractBalance >= totalVestedAmount + totalAmount, "Insufficient contract balance");
        
        vestingSchedules[beneficiary] = VestingSchedule({
            beneficiary: beneficiary,
            totalAmount: totalAmount,
            releasedAmount: 0,
            startTime: startTime,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            revoked: false
        });
        
        beneficiaries.push(beneficiary);
        totalVestedAmount += totalAmount;
        
        emit VestingScheduleCreated(beneficiary, totalAmount, startTime, cliffDuration, vestingDuration);
    }
    
    /**
     * @dev Release vested tokens for caller
     */
    function release() external nonReentrant {
        _release(msg.sender);
    }
    
    /**
     * @dev Release vested tokens for specific beneficiary (can be called by anyone)
     */
    function release(address beneficiary) external nonReentrant {
        _release(beneficiary);
    }
    
    /**
     * @dev Internal function to release vested tokens
     */
    function _release(address beneficiary) internal {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(schedule.totalAmount > 0, "No vesting schedule");
        require(!schedule.revoked, "Vesting revoked");
        
        uint256 releasableAmount = _calculateReleasableAmount(beneficiary);
        require(releasableAmount > 0, "No tokens to release");
        
        schedule.releasedAmount += releasableAmount;
        totalReleasedAmount += releasableAmount;
        
        require(kCodeToken.transfer(beneficiary, releasableAmount), "Token transfer failed");
        
        emit TokensReleased(beneficiary, releasableAmount);
    }
    
    /**
     * @dev Revoke vesting schedule (emergency only)
     */
    function revokeVesting(address beneficiary) external onlyOwner {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(schedule.totalAmount > 0, "No vesting schedule");
        require(!schedule.revoked, "Already revoked");
        
        // Release any already vested tokens first
        uint256 releasableAmount = _calculateReleasableAmount(beneficiary);
        if (releasableAmount > 0) {
            schedule.releasedAmount += releasableAmount;
            totalReleasedAmount += releasableAmount;
            require(kCodeToken.transfer(beneficiary, releasableAmount), "Token transfer failed");
            emit TokensReleased(beneficiary, releasableAmount);
        }
        
        // Mark as revoked
        schedule.revoked = true;
        
        // Calculate unvested amount
        uint256 unvestedAmount = schedule.totalAmount - schedule.releasedAmount;
        totalVestedAmount -= unvestedAmount;
        
        emit VestingRevoked(beneficiary, unvestedAmount);
    }
    
    /**
     * @dev Calculate releasable amount for beneficiary
     */
    function calculateReleasableAmount(address beneficiary) external view returns (uint256) {
        return _calculateReleasableAmount(beneficiary);
    }
    
    /**
     * @dev Internal function to calculate releasable amount
     */
    function _calculateReleasableAmount(address beneficiary) internal view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        
        if (schedule.totalAmount == 0 || schedule.revoked) {
            return 0;
        }
        
        // Check if cliff period has passed
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return 0;
        }
        
        uint256 timeVested = block.timestamp - schedule.startTime;
        
        // If fully vested
        if (timeVested >= schedule.vestingDuration) {
            return schedule.totalAmount - schedule.releasedAmount;
        }
        
        // Calculate linear vesting
        uint256 vestedAmount = (schedule.totalAmount * timeVested) / schedule.vestingDuration;
        return vestedAmount - schedule.releasedAmount;
    }
    
    /**
     * @dev Get vesting info for beneficiary
     */
    function getVestingInfo(address beneficiary) external view returns (
        uint256 totalAmount,
        uint256 releasedAmount,
        uint256 releasableAmount,
        uint256 remainingAmount,
        uint256 nextVestingTime,
        bool revoked
    ) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        
        totalAmount = schedule.totalAmount;
        releasedAmount = schedule.releasedAmount;
        releasableAmount = _calculateReleasableAmount(beneficiary);
        remainingAmount = totalAmount - releasedAmount;
        revoked = schedule.revoked;
        
        // Calculate next vesting time (when next tokens will be available)
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            nextVestingTime = schedule.startTime + schedule.cliffDuration;
        } else if (block.timestamp < schedule.startTime + schedule.vestingDuration) {
            nextVestingTime = block.timestamp + 1 days; // Daily vesting
        } else {
            nextVestingTime = 0; // Fully vested
        }
    }
    
    /**
     * @dev Get all beneficiaries
     */
    function getBeneficiaries() external view returns (address[] memory) {
        return beneficiaries;
    }
    
    /**
     * @dev Get contract status
     */
    function getContractStatus() external view returns (
        uint256 contractBalance,
        uint256 totalVested,
        uint256 totalReleased,
        uint256 totalPending
    ) {
        contractBalance = kCodeToken.balanceOf(address(this));
        totalVested = totalVestedAmount;
        totalReleased = totalReleasedAmount;
        totalPending = totalVestedAmount - totalReleasedAmount;
    }
    
    /**
     * @dev Emergency withdraw (only owner, only if no active vesting schedules)
     */
    function emergencyWithdraw() external onlyOwner {
        require(totalVestedAmount == 0, "Active vesting schedules exist");
        
        uint256 balance = kCodeToken.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        
        require(kCodeToken.transfer(owner(), balance), "Token transfer failed");
    }
}