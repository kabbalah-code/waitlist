import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { contractService } from '@/lib/web3/contracts'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get NFTs from database first
    const { data: dbNFTs, error: dbError } = await supabase
      .from('user_nfts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (dbError) {
      console.error('Error fetching NFTs from database:', dbError)
    }

    // Try to sync with blockchain
    try {
      await contractService.initialize()
      const blockchainNFTs = await contractService.getUserNFTs(user.wallet_address)
      
      // Get metadata for each NFT
      const nftsWithMetadata = await Promise.all(
        blockchainNFTs.map(async (tokenId) => {
          try {
            const metadata = await contractService.getNFTMetadata(tokenId)
            return {
              tokenId,
              ...metadata
            }
          } catch (error) {
            console.error(`Error fetching metadata for token ${tokenId}:`, error)
            return null
          }
        })
      )

      const validNFTs = nftsWithMetadata.filter(nft => nft !== null)

      // Update database with blockchain data
      for (const nft of validNFTs) {
        if (nft) {
          await supabase
            .from('user_nfts')
            .upsert({
              user_id: userId,
              wallet_address: user.wallet_address,
              contract_address: process.env.NEXT_PUBLIC_KABBALAH_NFT_ADDRESS || '',
              token_id: nft.tokenId,
              nft_type: nft.nftType,
              rarity: nft.rarity,
              level: nft.level,
              power: nft.power,
              is_soulbound: nft.soulbound,
              mystical_properties: nft.mysticalProperties,
              minted_at: new Date(Number(nft.mintedAt) * 1000).toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'contract_address,token_id'
            })
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          nfts: validNFTs,
          totalCount: validNFTs.length,
          source: 'blockchain'
        }
      })

    } catch (blockchainError) {
      console.error('Error fetching from blockchain:', blockchainError)
      
      // Fallback to database data
      return NextResponse.json({
        success: true,
        data: {
          nfts: dbNFTs || [],
          totalCount: dbNFTs?.length || 0,
          source: 'database'
        }
      })
    }

  } catch (error) {
    console.error('Error fetching NFTs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch NFTs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { nftType, rarity, soulbound, mysticalProperties, tokenURI, ethValue } = body

    const supabase = await createClient()
    
    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Initialize contract service
    await contractService.initialize()

    // Mint NFT on blockchain
    const tx = await contractService.mintNFT(
      nftType,
      rarity,
      soulbound,
      mysticalProperties,
      tokenURI,
      ethValue
    )

    // Record transaction in database
    const { error: txError } = await supabase
      .from('blockchain_transactions')
      .insert({
        user_id: userId,
        wallet_address: user.wallet_address,
        contract_address: process.env.NEXT_PUBLIC_KABBALAH_NFT_ADDRESS || '',
        transaction_hash: tx.hash,
        transaction_type: 'mint_nft',
        status: 'pending'
      })

    if (txError) {
      console.error('Error recording transaction:', txError)
    }

    return NextResponse.json({
      success: true,
      data: {
        transactionHash: tx.hash,
        status: 'pending'
      }
    })

  } catch (error) {
    console.error('Error minting NFT:', error)
    return NextResponse.json(
      { error: 'Failed to mint NFT' },
      { status: 500 }
    )
  }
}