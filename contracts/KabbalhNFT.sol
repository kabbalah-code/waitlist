// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title KabbalhNFT
 * @dev Sacred NFT collection for Kabbalah Code game
 * Features: Soulbound tokens, Achievement NFTs, Archetype NFTs
 */
contract KabbalhNFT is ERC721, ERC721URIStorage, ERC721Burnable, Ownable, Pausable, ReentrancyGuard {
    
    // NFT Categories
    enum NFTType { 
        ACHIEVEMENT,    // Achievement badges
        ARCHETYPE,      // Character archetypes  
        SEPHIROT,       // Tree of Life nodes
        SACRED,         // Special sacred items
        RITUAL          // Daily ritual completions
    }
    
    // NFT Rarity levels
    enum Rarity {
        COMMON,         // 60%
        UNCOMMON,       // 25% 
        RARE,           // 10%
        EPIC,           // 4%
        LEGENDARY       // 1%
    }
    
    struct NFTMetadata {
        NFTType nftType;
        Rarity rarity;
        uint256 level;
        uint256 power;
        bool soulbound;
        uint256 mintedAt;
        string mysticalProperties;
    }
    
    // State variables
    uint256 private _tokenIdCounter;
    uint256 public constant MAX_SUPPLY = 100000;
    uint256 public mintPrice = 0.001 ether; // ~$3 on Base
    
    // Mappings
    mapping(uint256 => NFTMetadata) public nftMetadata;
    mapping(address => bool) public authorizedMinters;
    mapping(NFTType => uint256) public typeSupply;
    mapping(address => mapping(NFTType => uint256)) public userTypeBalance;
    
    // Events
    event NFTMinted(address indexed to, uint256 indexed tokenId, NFTType nftType, Rarity rarity);
    event NFTUpgraded(uint256 indexed tokenId, uint256 newLevel, uint256 newPower);
    event SoulboundStatusChanged(uint256 indexed tokenId, bool soulbound);
    
    constructor(address initialOwner) 
        ERC721("Kabbalah Code Sacred NFT", "KCSACRED") 
        Ownable(initialOwner) 
    {
        _tokenIdCounter = 1; // Start from 1
    }
    
    /**
     * @dev Mint NFT with specific type and rarity
     * @param to Recipient address
     * @param nftType Type of NFT
     * @param rarity Rarity level
     * @param soulbound Whether NFT is soulbound
     * @param mysticalProperties Special properties string
     */
    function mintNFT(
        address to,
        NFTType nftType,
        Rarity rarity,
        bool soulbound,
        string memory mysticalProperties,
        string memory tokenURI
    ) external payable nonReentrant whenNotPaused {
        require(_tokenIdCounter <= MAX_SUPPLY, "Max supply reached");
        require(msg.value >= mintPrice || authorizedMinters[msg.sender], "Insufficient payment");
        require(to != address(0), "Cannot mint to zero address");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        // Calculate power based on rarity
        uint256 power = _calculatePower(rarity);
        
        // Store metadata
        nftMetadata[tokenId] = NFTMetadata({
            nftType: nftType,
            rarity: rarity,
            level: 1,
            power: power,
            soulbound: soulbound,
            mintedAt: block.timestamp,
            mysticalProperties: mysticalProperties
        });
        
        // Update counters
        typeSupply[nftType]++;
        userTypeBalance[to][nftType]++;
        
        // Mint token
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        emit NFTMinted(to, tokenId, nftType, rarity);
    }
    
    /**
     * @dev Batch mint for achievements/rewards
     */
    function batchMintAchievements(
        address[] calldata recipients,
        NFTType nftType,
        Rarity rarity,
        string[] calldata tokenURIs
    ) external onlyOwner {
        require(recipients.length == tokenURIs.length, "Arrays length mismatch");
        require(recipients.length <= 50, "Batch too large");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            if (_tokenIdCounter <= MAX_SUPPLY) {
                uint256 tokenId = _tokenIdCounter;
                _tokenIdCounter++;
                
                nftMetadata[tokenId] = NFTMetadata({
                    nftType: nftType,
                    rarity: rarity,
                    level: 1,
                    power: _calculatePower(rarity),
                    soulbound: true, // Achievements are soulbound
                    mintedAt: block.timestamp,
                    mysticalProperties: "Sacred Achievement"
                });
                
                typeSupply[nftType]++;
                userTypeBalance[recipients[i]][nftType]++;
                
                _safeMint(recipients[i], tokenId);
                _setTokenURI(tokenId, tokenURIs[i]);
                
                emit NFTMinted(recipients[i], tokenId, nftType, rarity);
            }
        }
    }
    
    /**
     * @dev Upgrade NFT level and power
     */
    function upgradeNFT(uint256 tokenId, uint256 newLevel) external payable {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(newLevel > nftMetadata[tokenId].level, "Level must increase");
        require(newLevel <= 100, "Max level is 100");
        
        uint256 upgradeCost = _calculateUpgradeCost(nftMetadata[tokenId].level, newLevel);
        require(msg.value >= upgradeCost, "Insufficient payment for upgrade");
        
        // Update metadata
        nftMetadata[tokenId].level = newLevel;
        nftMetadata[tokenId].power = _calculatePowerWithLevel(nftMetadata[tokenId].rarity, newLevel);
        
        emit NFTUpgraded(tokenId, newLevel, nftMetadata[tokenId].power);
    }
    
    /**
     * @dev Override transfer to handle soulbound tokens
     */
    function _update(address to, uint256 tokenId, address auth) 
        internal 
        override 
        returns (address) 
    {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0))
        if (from == address(0)) {
            return super._update(to, tokenId, auth);
        }
        
        // Check if token is soulbound
        if (nftMetadata[tokenId].soulbound) {
            require(from == address(0) || to == address(0), "Soulbound token cannot be transferred");
        }
        
        // Update user balances
        if (from != address(0)) {
            userTypeBalance[from][nftMetadata[tokenId].nftType]--;
        }
        if (to != address(0)) {
            userTypeBalance[to][nftMetadata[tokenId].nftType]++;
        }
        
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @dev Calculate power based on rarity and level
     */
    function _calculatePower(Rarity rarity) internal pure returns (uint256) {
        if (rarity == Rarity.COMMON) return 100;
        if (rarity == Rarity.UNCOMMON) return 250;
        if (rarity == Rarity.RARE) return 500;
        if (rarity == Rarity.EPIC) return 1000;
        if (rarity == Rarity.LEGENDARY) return 2500;
        return 100;
    }
    
    function _calculatePowerWithLevel(Rarity rarity, uint256 level) internal pure returns (uint256) {
        uint256 basePower = _calculatePower(rarity);
        return basePower + (basePower * level / 10); // 10% increase per level
    }
    
    function _calculateUpgradeCost(uint256 currentLevel, uint256 newLevel) internal pure returns (uint256) {
        uint256 levelDiff = newLevel - currentLevel;
        return levelDiff * 0.0001 ether; // 0.0001 ETH per level
    }
    
    // Admin functions
    function setMintPrice(uint256 _mintPrice) external onlyOwner {
        mintPrice = _mintPrice;
    }
    
    function setAuthorizedMinter(address minter, bool authorized) external onlyOwner {
        authorizedMinters[minter] = authorized;
    }
    
    function setSoulboundStatus(uint256 tokenId, bool soulbound) external onlyOwner {
        nftMetadata[tokenId].soulbound = soulbound;
        emit SoulboundStatusChanged(tokenId, soulbound);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    // View functions
    function getUserNFTs(address user) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(user);
        uint256[] memory tokenIds = new uint256[](balance);
        uint256 index = 0;
        
        for (uint256 i = 1; i < _tokenIdCounter && index < balance; i++) {
            if (_ownerOf(i) == user) {
                tokenIds[index] = i;
                index++;
            }
        }
        
        return tokenIds;
    }
    
    function getNFTMetadata(uint256 tokenId) external view returns (NFTMetadata memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return nftMetadata[tokenId];
    }
    
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter - 1;
    }
    
    // Required overrides
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}