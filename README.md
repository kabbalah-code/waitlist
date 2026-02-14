# Kabbalah Code Game

A Web3 gamification platform combining ancient Kabbalah wisdom with blockchain technology. Users earn KCODE tokens through daily rituals, meditation, tasks, and the Wheel of Fortune.

## Features

- 🎯 **Daily Ritual** - Share wisdom on Twitter, earn KCODE tokens
- 🧘 **Daily Meditation** - 1-minute mindfulness practice with rewards
- ✅ **Task System** - Complete social media tasks for tokens
- 🎡 **Wheel of Fortune** - Spin for KCODE and POL rewards
- 🌳 **Tree of Life Progress** - Track your spiritual journey through Sephirot
- 💰 **Blockchain Integration** - All rewards via smart contracts on Polygon
- 🔐 **Wallet Authentication** - Secure Web3 login

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Blockchain**: Solidity, Hardhat, Ethers.js
- **Network**: Polygon Amoy Testnet
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Wallet-based (MetaMask, WalletConnect)

## Smart Contracts

- **KCodeToken** - ERC20 token with controlled minting
- **GameEconomics** - Game logic and reward distribution
- **KabbalhNFT** - Achievement NFTs
- **TeamVesting** - Token vesting for team

## Getting Started

### Prerequisites

- Node.js 18+
- MetaMask or compatible Web3 wallet
- Supabase account
- Polygon Amoy testnet MATIC

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/kabbalah-code-game.git
cd kabbalah-code-game
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
- Supabase credentials
- Contract addresses
- Backend wallet private key
- Admin wallet addresses

4. Setup database:
```bash
# Run migrations in Supabase SQL editor
# Files in: migrations/ and supabase/migrations/
```

5. Deploy contracts (optional):
```bash
cd contracts-deploy
npm install
cp .env.example .env
# Edit .env with your deployment wallet
npx hardhat run scripts/deploy.js --network amoy
```

6. Run development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Main dashboard
│   └── admin/             # Admin panel
├── components/            # React components
│   ├── dashboard/         # Dashboard features
│   ├── web3/             # Web3 components
│   └── ui/               # UI components
├── lib/                   # Business logic
│   ├── web3/             # Blockchain integration
│   ├── supabase/         # Database clients
│   ├── auth/             # Authentication
│   └── security/         # Security & anti-abuse
├── contracts/             # Solidity contracts
├── contracts-deploy/      # Deployment scripts
├── migrations/            # Database migrations
└── public/               # Static assets
```

## Environment Variables

See `.env.example` for all required variables.

Key variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)
- `BACKEND_PRIVATE_KEY` - Wallet for contract interactions
- `NEXT_PUBLIC_KCODE_TOKEN_ADDRESS` - Deployed token address
- `ADMIN_WALLET_ADDRESSES` - Admin wallet addresses

## Security

- Never commit `.env.local` or `.env.contracts`
- Keep private keys secure
- Use service role key only on server-side
- Implement rate limiting for all endpoints
- Validate all user inputs

## Database Schema

Main tables:
- `users` - User profiles and balances
- `daily_rituals` - Daily ritual completions
- `daily_meditations` - Meditation sessions
- `tasks_completions` - Task completions
- `wheel_spins` - Wheel spin history
- `blockchain_transactions` - All token transactions

## Testing

```bash
# Run tests
npm test

# E2E tests
npm run test:e2e
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Manual

```bash
npm run build
npm start
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is proprietary. All rights reserved.

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/yourusername/kabbalah-code-game/issues)
- Documentation: See `/DataKnowledge` directory

## Roadmap

- [ ] Mainnet deployment
- [ ] Mobile app
- [ ] Additional Sephirot levels
- [ ] NFT marketplace
- [ ] Referral system enhancements
- [ ] Multi-language support

---

Built with ❤️ using Web3 technology
