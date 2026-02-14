import { ethers } from 'ethers'

// Contract addresses (update after deployment)
export const CONTRACT_ADDRESSES = {
  KCODE_TOKEN: process.env.NEXT_PUBLIC_KCODE_TOKEN_ADDRESS || '',
  KABBALAH_NFT: process.env.NEXT_PUBLIC_KABBALAH_NFT_ADDRESS || '',
  GAME_ECONOMICS: process.env.NEXT_PUBLIC_GAME_ECONOMICS_ADDRESS || '',
}

// Contract ABIs (simplified for frontend use)
export const KCODE_TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function stake(uint256 amount)',
  'function unstake(uint256 amount)',
  'function claimRewards()',
  'function getPendingRewards(address user) view returns (uint256)',
  'function convertPointsToTokens(uint256 points)',
  'function gamePoints(address user) view returns (uint256)',
  'function stakingInfo(address user) view returns (uint256 stakedAmount, uint256 stakingStartTime, uint256 lastRewardTime, uint256 pendingRewards)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event TokensStaked(address indexed user, uint256 amount)',
  'event TokensUnstaked(address indexed user, uint256 amount)',
  'event RewardsClaimed(address indexed user, uint256 amount)',
]

export const KABBALAH_NFT_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function approve(address to, uint256 tokenId)',
  'function getApproved(uint256 tokenId) view returns (address)',
  'function setApprovalForAll(address operator, bool approved)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
  'function mintNFT(address to, uint8 nftType, uint8 rarity, bool soulbound, string mysticalProperties, string tokenURI) payable',
  'function upgradeNFT(uint256 tokenId, uint256 newLevel) payable',
  'function getUserNFTs(address user) view returns (uint256[])',
  'function getNFTMetadata(uint256 tokenId) view returns (tuple(uint8 nftType, uint8 rarity, uint256 level, uint256 power, bool soulbound, uint256 mintedAt, string mysticalProperties))',
  'function userTypeBalance(address user, uint8 nftType) view returns (uint256)',
  'function mintPrice() view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event NFTMinted(address indexed to, uint256 indexed tokenId, uint8 nftType, uint8 rarity)',
  'event NFTUpgraded(uint256 indexed tokenId, uint256 newLevel, uint256 newPower)',
]

export const GAME_ECONOMICS_ABI = [
  'function userPoints(address user) view returns (uint256)',
  'function purchaseWithPoints(bytes32 itemId, uint256 quantity)',
  'function purchaseWithTokens(bytes32 itemId, uint256 quantity)',
  'function purchaseWithETH(bytes32 itemId, uint256 quantity) payable',
  'function getItemInfo(bytes32 itemId) view returns (string name, uint256 pointsCost, uint256 tokensCost, uint256 ethCost, bool isActive, uint256 maxPurchases)',
  'function getUserPurchases(address user, bytes32 itemId) view returns (uint256)',
  'function referralInfo(address user) view returns (address referrer, uint256 totalReferred, uint256 totalEarned, uint256 level1Count, uint256 level2Count, uint256 level3Count)',
  'function getReferralChain(address user) view returns (address level1, address level2, address level3)',
  'function getAllItemIds() view returns (bytes32[])',
  'function itemNameToId(string name) view returns (bytes32)',
  'event ItemPurchased(address indexed user, bytes32 indexed itemId, uint256 cost, string costType)',
  'event PointsAwarded(address indexed user, uint256 amount, string reason)',
  'event ReferralReward(address indexed referrer, address indexed referred, uint256 amount, uint256 level)',
]

// Contract instances
export class ContractService {
  private provider: ethers.BrowserProvider | null = null
  private signer: ethers.Signer | null = null
  private kCodeToken: ethers.Contract | null = null
  private kabbalhNFT: ethers.Contract | null = null
  private gameEconomics: ethers.Contract | null = null

  async initialize() {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum)
      this.signer = await this.provider.getSigner()
      
      // Initialize contracts
      this.kCodeToken = new ethers.Contract(
        CONTRACT_ADDRESSES.KCODE_TOKEN,
        KCODE_TOKEN_ABI,
        this.signer
      )
      
      this.kabbalhNFT = new ethers.Contract(
        CONTRACT_ADDRESSES.KABBALAH_NFT,
        KABBALAH_NFT_ABI,
        this.signer
      )
      
      this.gameEconomics = new ethers.Contract(
        CONTRACT_ADDRESSES.GAME_ECONOMICS,
        GAME_ECONOMICS_ABI,
        this.signer
      )
    }
  }

  // KCODE Token methods
  async getTokenBalance(address: string): Promise<string> {
    if (!this.kCodeToken) throw new Error('Contract not initialized')
    const balance = await this.kCodeToken.balanceOf(address)
    return ethers.formatEther(balance)
  }

  async getGamePoints(address: string): Promise<number> {
    if (!this.kCodeToken) throw new Error('Contract not initialized')
    const points = await this.kCodeToken.gamePoints(address)
    return Number(points)
  }

  async getPendingRewards(address: string): Promise<string> {
    if (!this.kCodeToken) throw new Error('Contract not initialized')
    const rewards = await this.kCodeToken.getPendingRewards(address)
    return ethers.formatEther(rewards)
  }

  async stakeTokens(amount: string): Promise<ethers.TransactionResponse> {
    if (!this.kCodeToken) throw new Error('Contract not initialized')
    const amountWei = ethers.parseEther(amount)
    return await this.kCodeToken.stake(amountWei)
  }

  async unstakeTokens(amount: string): Promise<ethers.TransactionResponse> {
    if (!this.kCodeToken) throw new Error('Contract not initialized')
    const amountWei = ethers.parseEther(amount)
    return await this.kCodeToken.unstake(amountWei)
  }

  async claimRewards(): Promise<ethers.TransactionResponse> {
    if (!this.kCodeToken) throw new Error('Contract not initialized')
    return await this.kCodeToken.claimRewards()
  }

  async convertPointsToTokens(points: number): Promise<ethers.TransactionResponse> {
    if (!this.kCodeToken) throw new Error('Contract not initialized')
    return await this.kCodeToken.convertPointsToTokens(points)
  }

  // NFT methods
  async getUserNFTs(address: string): Promise<number[]> {
    if (!this.kabbalhNFT) throw new Error('Contract not initialized')
    const tokenIds = await this.kabbalhNFT.getUserNFTs(address)
    return tokenIds.map((id: bigint) => Number(id))
  }

  async getNFTMetadata(tokenId: number) {
    if (!this.kabbalhNFT) throw new Error('Contract not initialized')
    return await this.kabbalhNFT.getNFTMetadata(tokenId)
  }

  async mintNFT(
    nftType: number,
    rarity: number,
    soulbound: boolean,
    mysticalProperties: string,
    tokenURI: string,
    ethValue?: string
  ): Promise<ethers.TransactionResponse> {
    if (!this.kabbalhNFT) throw new Error('Contract not initialized')
    
    const options = ethValue ? { value: ethers.parseEther(ethValue) } : {}
    
    return await this.kabbalhNFT.mintNFT(
      await this.signer!.getAddress(),
      nftType,
      rarity,
      soulbound,
      mysticalProperties,
      tokenURI,
      options
    )
  }

  async upgradeNFT(tokenId: number, newLevel: number, ethValue: string): Promise<ethers.TransactionResponse> {
    if (!this.kabbalhNFT) throw new Error('Contract not initialized')
    return await this.kabbalhNFT.upgradeNFT(tokenId, newLevel, {
      value: ethers.parseEther(ethValue)
    })
  }

  // Game Economics methods
  async getUserPoints(address: string): Promise<number> {
    if (!this.gameEconomics) throw new Error('Contract not initialized')
    const points = await this.gameEconomics.userPoints(address)
    return Number(points)
  }

  async purchaseWithPoints(itemId: string, quantity: number): Promise<ethers.TransactionResponse> {
    if (!this.gameEconomics) throw new Error('Contract not initialized')
    return await this.gameEconomics.purchaseWithPoints(itemId, quantity)
  }

  async purchaseWithTokens(itemId: string, quantity: number): Promise<ethers.TransactionResponse> {
    if (!this.gameEconomics) throw new Error('Contract not initialized')
    return await this.gameEconomics.purchaseWithTokens(itemId, quantity)
  }

  async purchaseWithETH(itemId: string, quantity: number, ethValue: string): Promise<ethers.TransactionResponse> {
    if (!this.gameEconomics) throw new Error('Contract not initialized')
    return await this.gameEconomics.purchaseWithETH(itemId, quantity, {
      value: ethers.parseEther(ethValue)
    })
  }

  async getItemInfo(itemId: string) {
    if (!this.gameEconomics) throw new Error('Contract not initialized')
    return await this.gameEconomics.getItemInfo(itemId)
  }

  async getReferralInfo(address: string) {
    if (!this.gameEconomics) throw new Error('Contract not initialized')
    return await this.gameEconomics.referralInfo(address)
  }

  async getAllItemIds(): Promise<string[]> {
    if (!this.gameEconomics) throw new Error('Contract not initialized')
    return await this.gameEconomics.getAllItemIds()
  }

  async getItemIdByName(name: string): Promise<string> {
    if (!this.gameEconomics) throw new Error('Contract not initialized')
    return await this.gameEconomics.itemNameToId(name)
  }
}

// Singleton instance
export const contractService = new ContractService()

// Helper functions
export const formatTokenAmount = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toFixed(2)
}

export const NFT_TYPES = {
  ACHIEVEMENT: 0,
  ARCHETYPE: 1,
  SEPHIROT: 2,
  SACRED: 3,
  RITUAL: 4,
} as const

export const NFT_RARITIES = {
  COMMON: 0,
  UNCOMMON: 1,
  RARE: 2,
  EPIC: 3,
  LEGENDARY: 4,
} as const

export const RARITY_COLORS = {
  [NFT_RARITIES.COMMON]: '#9CA3AF',
  [NFT_RARITIES.UNCOMMON]: '#10B981',
  [NFT_RARITIES.RARE]: '#3B82F6',
  [NFT_RARITIES.EPIC]: '#8B5CF6',
  [NFT_RARITIES.LEGENDARY]: '#F59E0B',
}