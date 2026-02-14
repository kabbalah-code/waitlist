// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IKabbalhNFT is IERC721 {
    enum NFTType { 
        ACHIEVEMENT,
        ARCHETYPE,
        SEPHIROT,
        SACRED,
        RITUAL
    }
    
    enum Rarity {
        COMMON,
        UNCOMMON,
        RARE,
        EPIC,
        LEGENDARY
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
    
    function mintNFT(
        address to,
        NFTType nftType,
        Rarity rarity,
        bool soulbound,
        string memory mysticalProperties,
        string memory tokenURI
    ) external payable;
    
    function batchMintAchievements(
        address[] calldata recipients,
        NFTType nftType,
        Rarity rarity,
        string[] calldata tokenURIs
    ) external;
    
    function upgradeNFT(uint256 tokenId, uint256 newLevel) external payable;
    function getUserNFTs(address user) external view returns (uint256[] memory);
    function getNFTMetadata(uint256 tokenId) external view returns (NFTMetadata memory);
    function userTypeBalance(address user, NFTType nftType) external view returns (uint256);
}