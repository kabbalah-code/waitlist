// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title KCodeToken
 * @dev $KCODE - The sacred token of Kabbalah Code ecosystem
 * Features: Pre-minted reserves, controlled distribution, referral rewards
 */
contract KCodeToken is ERC20, ERC20Burnable, ERC20Permit, Ownable, Pausable, ReentrancyGuard {
    
    // Token Economics
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1B tokens
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10**18; // 100M tokens (10%)
    
    // Distribution amounts
    uint256 public constant TEAM_ALLOCATION = 150_000_000 * 10**18; // 15%
    uint256 public constant COMMUNITY_REWARDS = 400_000_000 * 10**18; // 40%
    uint256 public constant LIQUIDITY_POOL = 200_000_000 * 10**18; // 20%
    uint256 public constant TREASURY = 150_000_000 * 10**18; // 15%
    
    // Reserve addresses (will be set in constructor)
    address public immutable COMMUNITY_RESERVE;
    address public immutable LIQUIDITY_RESERVE;
    address public immutable TREASURY_RESERVE;
    address public immutable TEAM_RESERVE;
    
    // Vesting and release schedules
    mapping(address => VestingSchedule) public vestingSchedules;
    mapping(address => bool) public authorizedMinters;
    
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 startTime;
        uint256 duration;
        uint256 cliffDuration;
    }
    
    // Staking system
    struct StakingInfo {
        uint256 stakedAmount;
        uint256 stakingStartTime;
        uint256 lastRewardTime;
        uint256 pendingRewards;
    }
    
    mapping(address => StakingInfo) public stakingInfo;
    uint256 public totalStaked;
    uint256 public stakingRewardRate = 100; // 1% per year (100 basis points)
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    
    // Game integration
    mapping(address => uint256) public gamePoints; // Points earned in game
    uint256 public pointsToTokenRate = 1000; // 1000 points = 1 KCODE
    
    // Burn tracking
    uint256 public totalBurned;
    
    // Events
    event TokensStaked(address indexed user, uint256 amount);
    event TokensUnstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event PointsConverted(address indexed user, uint256 points, uint256 tokens);
    event VestingScheduleCreated(address indexed beneficiary, uint256 amount, uint256 duration);
    event GameRewardMinted(address indexed user, uint256 amount, string activity);
    event LowReserveWarning(address indexed reserve, uint256 remaining, uint256 percentRemaining);
    event TokensBurned(address indexed from, uint256 amount, string reason);
    
    constructor(
        address initialOwner,
        address _communityReserve,
        address _liquidityReserve,
        address _treasuryReserve,
        address _teamReserve
    ) 
        ERC20("Kabbalah Code Token", "KCODE") 
        ERC20Permit("Kabbalah Code Token")
        Ownable(initialOwner) 
    {
        require(_communityReserve != address(0), "Invalid community reserve");
        require(_liquidityReserve != address(0), "Invalid liquidity reserve");
        require(_treasuryReserve != address(0), "Invalid treasury reserve");
        require(_teamReserve != address(0), "Invalid team reserve");
        
        // Set immutable reserve addresses
        COMMUNITY_RESERVE = _communityReserve;
        LIQUIDITY_RESERVE = _liquidityReserve;
        TREASURY_RESERVE = _treasuryReserve;
        TEAM_RESERVE = _teamReserve;
        
        // Pre-mint all reserves
        _mint(initialOwner, INITIAL_SUPPLY);           // 100M to owner for IDO/distribution
        _mint(COMMUNITY_RESERVE, COMMUNITY_REWARDS);   // 400M for user rewards
        _mint(LIQUIDITY_RESERVE, LIQUIDITY_POOL);      // 200M for DEX liquidity
        _mint(TREASURY_RESERVE, TREASURY);             // 150M for treasury/marketing
        _mint(TEAM_RESERVE, TEAM_ALLOCATION);          // 150M for team (vesting)
        
        // Verify total supply
        require(totalSupply() == MAX_SUPPLY, "Total supply mismatch");
    }
    
    /**
     * @dev Stake tokens to earn rewards
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Cannot stake 0 tokens");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Update pending rewards before changing stake
        _updateRewards(msg.sender);
        
        // Transfer tokens to contract
        _transfer(msg.sender, address(this), amount);
        
        // Update staking info
        stakingInfo[msg.sender].stakedAmount += amount;
        stakingInfo[msg.sender].stakingStartTime = block.timestamp;
        stakingInfo[msg.sender].lastRewardTime = block.timestamp;
        
        totalStaked += amount;
        
        emit TokensStaked(msg.sender, amount);
    }
    
    /**
     * @dev Unstake tokens
     */
    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot unstake 0 tokens");
        require(stakingInfo[msg.sender].stakedAmount >= amount, "Insufficient staked amount");
        
        // Update and claim pending rewards
        _updateRewards(msg.sender);
        _claimRewards(msg.sender);
        
        // Update staking info
        stakingInfo[msg.sender].stakedAmount -= amount;
        totalStaked -= amount;
        
        // Transfer tokens back to user
        _transfer(address(this), msg.sender, amount);
        
        emit TokensUnstaked(msg.sender, amount);
    }
    
    /**
     * @dev Claim staking rewards
     */
    function claimRewards() external nonReentrant {
        _updateRewards(msg.sender);
        _claimRewards(msg.sender);
    }
    
    /**
     * @dev Convert game points to tokens
     */
    function convertPointsToTokens(uint256 points) external nonReentrant whenNotPaused {
        require(points > 0, "Cannot convert 0 points");
        require(gamePoints[msg.sender] >= points, "Insufficient points");
        
        uint256 tokensToMint = points / pointsToTokenRate;
        require(tokensToMint > 0, "Not enough points for conversion");
        require(totalSupply() + tokensToMint <= MAX_SUPPLY, "Would exceed max supply");
        
        // Deduct points
        gamePoints[msg.sender] -= points;
        
        // Mint tokens
        _mint(msg.sender, tokensToMint);
        
        emit PointsConverted(msg.sender, points, tokensToMint);
    }
    
    /**
     * @dev Add game points (only authorized game contracts)
     */
    function addGamePoints(address user, uint256 points) external {
        require(authorizedMinters[msg.sender], "Not authorized");
        gamePoints[user] += points;
    }
    
    /**
     * @dev Reward user with tokens from community reserve (replaces mintGameRewards)
     */
    function rewardUser(address to, uint256 amount, string memory activity) external {
        require(authorizedMinters[msg.sender], "Not authorized");
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be positive");
        require(amount <= 1000 * 10**18, "Amount too large for single reward"); // Max 1000 tokens per reward
        
        // Check community reserve balance
        uint256 reserveBalance = balanceOf(COMMUNITY_RESERVE);
        require(reserveBalance >= amount, "Community reserve depleted");
        
        // Transfer from reserve instead of minting
        _transfer(COMMUNITY_RESERVE, to, amount);
        
        // Check for low reserve warning
        uint256 remainingBalance = balanceOf(COMMUNITY_RESERVE);
        uint256 percentRemaining = (remainingBalance * 100) / COMMUNITY_REWARDS;
        
        if (percentRemaining < 10) {
            emit LowReserveWarning(COMMUNITY_RESERVE, remainingBalance, percentRemaining);
        }
        
        emit GameRewardMinted(to, amount, activity);
    }
    
    /**
     * @dev Burn tokens for game activities (wheel spins, NFT purchases, etc.)
     * @param from Address to burn tokens from
     * @param amount Amount to burn
     * @param reason Reason for burning (for tracking)
     */
    function burnForActivity(address from, uint256 amount, string memory reason) external {
        require(authorizedMinters[msg.sender], "Not authorized");
        require(from != address(0), "Invalid address");
        require(amount > 0, "Amount must be positive");
        require(balanceOf(from) >= amount, "Insufficient balance");
        
        _burn(from, amount);
        totalBurned += amount;
        
        emit TokensBurned(from, amount, reason);
    }
    
    /**
     * @dev Burn tokens and transfer remaining to treasury (for purchases)
     * @param from Address to burn/transfer from
     * @param totalAmount Total amount to process
     * @param burnPercent Percentage to burn (in basis points, e.g., 5000 = 50%)
     * @param reason Reason for burning
     */
    function burnAndTransfer(
        address from, 
        uint256 totalAmount, 
        uint256 burnPercent, 
        string memory reason
    ) external {
        require(authorizedMinters[msg.sender], "Not authorized");
        require(from != address(0), "Invalid address");
        require(totalAmount > 0, "Amount must be positive");
        require(burnPercent <= 10000, "Burn percent too high"); // Max 100%
        require(balanceOf(from) >= totalAmount, "Insufficient balance");
        
        uint256 burnAmount = (totalAmount * burnPercent) / 10000;
        uint256 treasuryAmount = totalAmount - burnAmount;
        
        // Burn portion
        if (burnAmount > 0) {
            _burn(from, burnAmount);
            totalBurned += burnAmount;
            emit TokensBurned(from, burnAmount, reason);
        }
        
        // Transfer remaining to treasury
        if (treasuryAmount > 0) {
            _transfer(from, TREASURY_RESERVE, treasuryAmount);
        }
    }
    /**
     * @dev Get community reserve status
     */
    function getCommunityReserveStatus() external view returns (
        uint256 remaining,
        uint256 spent,
        uint256 percentRemaining,
        uint256 percentSpent
    ) {
        remaining = balanceOf(COMMUNITY_RESERVE);
        spent = COMMUNITY_REWARDS - remaining;
        percentRemaining = (remaining * 100) / COMMUNITY_REWARDS;
        percentSpent = (spent * 100) / COMMUNITY_REWARDS;
    }
    
    /**
     * @dev Get burn statistics
     */
    function getBurnStats() external view returns (
        uint256 totalBurnedAmount,
        uint256 circulatingSupply,
        uint256 burnPercentage
    ) {
        totalBurnedAmount = totalBurned;
        circulatingSupply = totalSupply();
        burnPercentage = totalBurned > 0 ? (totalBurned * 100) / MAX_SUPPLY : 0;
    }
    
    /**
     * @dev Create vesting schedule for team/advisors
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 duration,
        uint256 cliffDuration
    ) external onlyOwner {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(amount > 0, "Amount must be positive");
        require(duration > 0, "Duration must be positive");
        require(cliffDuration <= duration, "Cliff cannot exceed duration");
        require(vestingSchedules[beneficiary].totalAmount == 0, "Schedule already exists");
        
        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            releasedAmount: 0,
            startTime: startTime,
            duration: duration,
            cliffDuration: cliffDuration
        });
        
        emit VestingScheduleCreated(beneficiary, amount, duration);
    }
    
    /**
     * @dev Release vested tokens
     */
    function releaseVestedTokens() external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(schedule.totalAmount > 0, "No vesting schedule");
        
        uint256 releasableAmount = _calculateReleasableAmount(msg.sender);
        require(releasableAmount > 0, "No tokens to release");
        
        schedule.releasedAmount += releasableAmount;
        
        // Mint tokens if needed or transfer from treasury
        if (totalSupply() + releasableAmount <= MAX_SUPPLY) {
            _mint(msg.sender, releasableAmount);
        } else {
            // Transfer from contract balance (pre-allocated)
            require(balanceOf(address(this)) >= releasableAmount, "Insufficient contract balance");
            _transfer(address(this), msg.sender, releasableAmount);
        }
    }
    
    /**
     * @dev Emergency mint for game rewards (DEPRECATED - use rewardUser instead)
     */
    function mintGameRewards(address to, uint256 amount) external {
        revert("DEPRECATED: Use rewardUser instead");
    }
    
    /**
     * @dev Update staking rewards for user
     */
    function _updateRewards(address user) internal {
        StakingInfo storage info = stakingInfo[user];
        
        if (info.stakedAmount > 0 && info.lastRewardTime < block.timestamp) {
            uint256 timeStaked = block.timestamp - info.lastRewardTime;
            uint256 rewards = (info.stakedAmount * stakingRewardRate * timeStaked) / 
                             (10000 * SECONDS_PER_YEAR);
            
            info.pendingRewards += rewards;
            info.lastRewardTime = block.timestamp;
        }
    }
    
    /**
     * @dev Claim pending rewards
     */
    function _claimRewards(address user) internal {
        StakingInfo storage info = stakingInfo[user];
        
        if (info.pendingRewards > 0) {
            uint256 rewards = info.pendingRewards;
            info.pendingRewards = 0;
            
            // Mint reward tokens (if within supply limit)
            if (totalSupply() + rewards <= MAX_SUPPLY) {
                _mint(user, rewards);
                emit RewardsClaimed(user, rewards);
            }
        }
    }
    
    /**
     * @dev Calculate releasable vested amount
     */
    function _calculateReleasableAmount(address beneficiary) internal view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return 0;
        }
        
        uint256 timeVested = block.timestamp - schedule.startTime;
        if (timeVested >= schedule.duration) {
            return schedule.totalAmount - schedule.releasedAmount;
        }
        
        uint256 vestedAmount = (schedule.totalAmount * timeVested) / schedule.duration;
        return vestedAmount - schedule.releasedAmount;
    }
    
    // Admin functions
    function setStakingRewardRate(uint256 newRate) external onlyOwner {
        require(newRate <= 2000, "Rate too high"); // Max 20%
        stakingRewardRate = newRate;
    }
    
    function setPointsToTokenRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "Rate must be positive");
        pointsToTokenRate = newRate;
    }
    
    function setAuthorizedMinter(address minter, bool authorized) external onlyOwner {
        authorizedMinters[minter] = authorized;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = payable(owner()).call{value: balance}("");
            require(success, "Withdrawal failed");
        }
    }
    
    // View functions
    function getPendingRewards(address user) external view returns (uint256) {
        StakingInfo storage info = stakingInfo[user];
        
        if (info.stakedAmount == 0) return info.pendingRewards;
        
        uint256 timeStaked = block.timestamp - info.lastRewardTime;
        uint256 newRewards = (info.stakedAmount * stakingRewardRate * timeStaked) / 
                            (10000 * SECONDS_PER_YEAR);
        
        return info.pendingRewards + newRewards;
    }
    
    function getVestingInfo(address beneficiary) external view returns (
        uint256 totalAmount,
        uint256 releasedAmount,
        uint256 releasableAmount,
        uint256 remainingAmount
    ) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        totalAmount = schedule.totalAmount;
        releasedAmount = schedule.releasedAmount;
        releasableAmount = _calculateReleasableAmount(beneficiary);
        remainingAmount = totalAmount - releasedAmount;
    }
    
    // Override transfer to handle pausing
    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        super._update(from, to, value);
    }
}