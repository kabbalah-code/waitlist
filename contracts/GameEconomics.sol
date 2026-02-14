// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IKCodeToken.sol";
import "./interfaces/IKabbalhNFT.sol";

/**
 * @title GameEconomics
 * @dev Manages in-game economy, purchases, rewards, and referrals
 */
contract GameEconomics is Ownable, Pausable, ReentrancyGuard {
    
    IKCodeToken public kCodeToken;
    IKabbalhNFT public kabbalhNFT;
    
    // Game Economics
    struct GameItem {
        string name;
        uint256 pointsCost;
        uint256 tokensCost;
        uint256 ethCost;
        bool isActive;
        uint256 maxPurchases;
        mapping(address => uint256) userPurchases;
    }
    
    struct ReferralInfo {
        address referrer;
        uint256 totalReferred;
        uint256 totalEarned;
        uint256 level1Count;
        uint256 level2Count;
        uint256 level3Count;
    }
    
    // State variables
    mapping(bytes32 => GameItem) public gameItems;
    mapping(address => ReferralInfo) public referralInfo;
    mapping(address => uint256) public userPoints;
    mapping(string => bytes32) public itemNameToId;
    
    // Referral percentages (basis points) - UPDATED
    uint256 public constant REFERRAL_L1_PERCENT = 500;  // 5% (was 15%)
    uint256 public constant REFERRAL_L2_PERCENT = 300;  // 3% (was 7%)
    uint256 public constant REFERRAL_L3_PERCENT = 100;  // 1% (was 3%)
    // Total referral inflation: 9% (was 25%)
    
    // Game items
    bytes32[] public itemIds;
    
    // Events
    event ItemPurchased(address indexed user, bytes32 indexed itemId, uint256 cost, string costType);
    event PointsAwarded(address indexed user, uint256 amount, string reason);
    event ReferralReward(address indexed referrer, address indexed referred, uint256 amount, uint256 level);
    event ItemCreated(bytes32 indexed itemId, string name, uint256 pointsCost, uint256 tokensCost);
    
    constructor(
        address _kCodeToken,
        address _kabbalhNFT,
        address initialOwner
    ) Ownable(initialOwner) {
        kCodeToken = IKCodeToken(_kCodeToken);
        kabbalhNFT = IKabbalhNFT(_kabbalhNFT);
        
        // Initialize default game items
        _createDefaultItems();
    }
    
    /**
     * @dev Purchase game item with points
     */
    function purchaseWithPoints(bytes32 itemId, uint256 quantity) external nonReentrant whenNotPaused {
        GameItem storage item = gameItems[itemId];
        require(item.isActive, "Item not active");
        require(quantity > 0, "Quantity must be positive");
        
        uint256 totalCost = item.pointsCost * quantity;
        require(userPoints[msg.sender] >= totalCost, "Insufficient points");
        require(item.userPurchases[msg.sender] + quantity <= item.maxPurchases, "Purchase limit exceeded");
        
        // Deduct points
        userPoints[msg.sender] -= totalCost;
        item.userPurchases[msg.sender] += quantity;
        
        // Process purchase effects
        _processPurchaseEffects(msg.sender, itemId, quantity);
        
        emit ItemPurchased(msg.sender, itemId, totalCost, "points");
    }
    
    /**
     * @dev Purchase game item with KCODE tokens (with burn mechanism)
     */
    function purchaseWithTokens(bytes32 itemId, uint256 quantity) external nonReentrant whenNotPaused {
        GameItem storage item = gameItems[itemId];
        require(item.isActive, "Item not active");
        require(quantity > 0, "Quantity must be positive");
        require(item.tokensCost > 0, "Item not available for tokens");
        
        uint256 totalCost = item.tokensCost * quantity;
        require(kCodeToken.balanceOf(msg.sender) >= totalCost, "Insufficient tokens");
        require(item.userPurchases[msg.sender] + quantity <= item.maxPurchases, "Purchase limit exceeded");
        
        // Approve this contract to spend user's tokens
        require(kCodeToken.transferFrom(msg.sender, address(this), totalCost), "Token transfer failed");
        
        // Burn 50% of tokens, send 50% to treasury
        kCodeToken.burnAndTransfer(address(this), totalCost, 5000, string(abi.encodePacked("Purchase: ", item.name)));
        
        item.userPurchases[msg.sender] += quantity;
        
        // Process purchase effects
        _processPurchaseEffects(msg.sender, itemId, quantity);
        
        emit ItemPurchased(msg.sender, itemId, totalCost, "tokens");
    }
    
    /**
     * @dev Purchase game item with ETH
     */
    function purchaseWithETH(bytes32 itemId, uint256 quantity) external payable nonReentrant whenNotPaused {
        GameItem storage item = gameItems[itemId];
        require(item.isActive, "Item not active");
        require(quantity > 0, "Quantity must be positive");
        require(item.ethCost > 0, "Item not available for ETH");
        
        uint256 totalCost = item.ethCost * quantity;
        require(msg.value >= totalCost, "Insufficient ETH");
        require(item.userPurchases[msg.sender] + quantity <= item.maxPurchases, "Purchase limit exceeded");
        
        item.userPurchases[msg.sender] += quantity;
        
        // Process purchase effects
        _processPurchaseEffects(msg.sender, itemId, quantity);
        
        // Refund excess ETH
        if (msg.value > totalCost) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - totalCost}("");
            require(success, "Refund failed");
        }
        
        emit ItemPurchased(msg.sender, itemId, totalCost, "eth");
    }
    
    /**
     * @dev Award points to user with referral rewards
     */
    function awardPoints(address user, uint256 amount, string memory reason) external onlyOwner {
        userPoints[user] += amount;
        
        // Distribute referral rewards
        _distributeReferralRewards(user, amount);
        
        emit PointsAwarded(user, amount, reason);
    }
    
    /**
     * @dev Set referral relationship
     */
    function setReferrer(address user, address referrer) external onlyOwner {
        require(user != referrer, "Cannot refer yourself");
        require(referralInfo[user].referrer == address(0), "Referrer already set");
        require(referrer != address(0), "Invalid referrer");
        
        referralInfo[user].referrer = referrer;
        referralInfo[referrer].totalReferred++;
        referralInfo[referrer].level1Count++;
        
        // Update level 2 referrer
        address level2Referrer = referralInfo[referrer].referrer;
        if (level2Referrer != address(0)) {
            referralInfo[level2Referrer].level2Count++;
            
            // Update level 3 referrer
            address level3Referrer = referralInfo[level2Referrer].referrer;
            if (level3Referrer != address(0)) {
                referralInfo[level3Referrer].level3Count++;
            }
        }
    }
    
    /**
     * @dev Create new game item
     */
    function createGameItem(
        string memory name,
        uint256 pointsCost,
        uint256 tokensCost,
        uint256 ethCost,
        uint256 maxPurchases
    ) external onlyOwner {
        bytes32 itemId = keccak256(abi.encodePacked(name, block.timestamp));
        
        GameItem storage item = gameItems[itemId];
        item.name = name;
        item.pointsCost = pointsCost;
        item.tokensCost = tokensCost;
        item.ethCost = ethCost;
        item.isActive = true;
        item.maxPurchases = maxPurchases;
        
        itemIds.push(itemId);
        itemNameToId[name] = itemId;
        
        emit ItemCreated(itemId, name, pointsCost, tokensCost);
    }
    
    /**
     * @dev Process purchase effects (internal)
     */
    function _processPurchaseEffects(address user, bytes32 itemId, uint256 quantity) internal {
        GameItem storage item = gameItems[itemId];
        
        // Handle different item types
        if (keccak256(bytes(item.name)) == keccak256(bytes("Extra Spin"))) {
            // Award extra spins (handled off-chain)
            // Could emit event for backend to process
        } else if (keccak256(bytes(item.name)) == keccak256(bytes("Point Multiplier"))) {
            // Award multiplier (handled off-chain)
        } else if (keccak256(bytes(item.name)) == keccak256(bytes("Sacred NFT"))) {
            // Mint NFT
            // This would require the NFT contract to have this contract as authorized minter
        }
    }
    
    /**
     * @dev Distribute referral rewards
     */
    function _distributeReferralRewards(address user, uint256 amount) internal {
        address currentReferrer = referralInfo[user].referrer;
        uint256 level = 1;
        
        while (currentReferrer != address(0) && level <= 3) {
            uint256 rewardPercent;
            
            if (level == 1) rewardPercent = REFERRAL_L1_PERCENT;
            else if (level == 2) rewardPercent = REFERRAL_L2_PERCENT;
            else rewardPercent = REFERRAL_L3_PERCENT;
            
            uint256 reward = (amount * rewardPercent) / 10000;
            
            if (reward > 0) {
                userPoints[currentReferrer] += reward;
                referralInfo[currentReferrer].totalEarned += reward;
                
                emit ReferralReward(currentReferrer, user, reward, level);
            }
            
            currentReferrer = referralInfo[currentReferrer].referrer;
            level++;
        }
    }
    
    /**
     * @dev Initialize default game items
     */
    function _createDefaultItems() internal {
        // Extra Spin
        bytes32 extraSpinId = keccak256(abi.encodePacked("Extra Spin", block.timestamp));
        GameItem storage extraSpin = gameItems[extraSpinId];
        extraSpin.name = "Extra Spin";
        extraSpin.pointsCost = 100;
        extraSpin.tokensCost = 1 * 10**18; // 1 KCODE
        extraSpin.ethCost = 0.001 ether;
        extraSpin.isActive = true;
        extraSpin.maxPurchases = 10;
        itemIds.push(extraSpinId);
        itemNameToId["Extra Spin"] = extraSpinId;
        
        // Point Multiplier
        bytes32 multiplierId = keccak256(abi.encodePacked("Point Multiplier", block.timestamp + 1));
        GameItem storage multiplier = gameItems[multiplierId];
        multiplier.name = "Point Multiplier";
        multiplier.pointsCost = 500;
        multiplier.tokensCost = 5 * 10**18; // 5 KCODE
        multiplier.ethCost = 0.005 ether;
        multiplier.isActive = true;
        multiplier.maxPurchases = 5;
        itemIds.push(multiplierId);
        itemNameToId["Point Multiplier"] = multiplierId;
        
        // Sacred NFT
        bytes32 nftId = keccak256(abi.encodePacked("Sacred NFT", block.timestamp + 2));
        GameItem storage nft = gameItems[nftId];
        nft.name = "Sacred NFT";
        nft.pointsCost = 1000;
        nft.tokensCost = 10 * 10**18; // 10 KCODE
        nft.ethCost = 0.01 ether;
        nft.isActive = true;
        nft.maxPurchases = 1;
        itemIds.push(nftId);
        itemNameToId["Sacred NFT"] = nftId;
    }
    
    // Admin functions
    function updateItemStatus(bytes32 itemId, bool isActive) external onlyOwner {
        gameItems[itemId].isActive = isActive;
    }
    
    function updateItemCosts(
        bytes32 itemId,
        uint256 pointsCost,
        uint256 tokensCost,
        uint256 ethCost
    ) external onlyOwner {
        GameItem storage item = gameItems[itemId];
        item.pointsCost = pointsCost;
        item.tokensCost = tokensCost;
        item.ethCost = ethCost;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    function withdrawTokens() external onlyOwner {
        uint256 balance = kCodeToken.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        
        require(kCodeToken.transfer(owner(), balance), "Token withdrawal failed");
    }
    
    // View functions
    function getUserPurchases(address user, bytes32 itemId) external view returns (uint256) {
        return gameItems[itemId].userPurchases[user];
    }
    
    function getItemInfo(bytes32 itemId) external view returns (
        string memory name,
        uint256 pointsCost,
        uint256 tokensCost,
        uint256 ethCost,
        bool isActive,
        uint256 maxPurchases
    ) {
        GameItem storage item = gameItems[itemId];
        return (
            item.name,
            item.pointsCost,
            item.tokensCost,
            item.ethCost,
            item.isActive,
            item.maxPurchases
        );
    }
    
    function getReferralChain(address user) external view returns (
        address level1,
        address level2,
        address level3
    ) {
        level1 = referralInfo[user].referrer;
        if (level1 != address(0)) {
            level2 = referralInfo[level1].referrer;
            if (level2 != address(0)) {
                level3 = referralInfo[level2].referrer;
            }
        }
    }
    
    function getAllItemIds() external view returns (bytes32[] memory) {
        return itemIds;
    }
}