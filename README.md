# NFT Ticketing DApp (Smart Contracts + Vite/React Frontend)

A full-stack, EVM-compatible NFT ticketing application that lets event organizers mint tickets as NFTs and users buy, list, and transfer them. The repository contains:

- Solidity smart contracts (Hardhat)
- A modern React frontend built with Vite and TailwindCSS
- Deployment scripts and tests

This README covers setup, development, testing, deploying contracts, configuring the frontend, and hosting options (Netlify, Vercel, GitHub Pages), plus security and troubleshooting notes.

## Project Structure

.
├── contracts/                     # Smart contracts
│   ├── TicketNFT.sol              # NFT Ticket contract
│   └── TicketMarketplace.sol      # Marketplace for resales
│
├── scripts/
│   └── deploy-sei.js              # Deployment script for Sei network
│
├── test/
│   └── TicketNFT.js               # Hardhat test cases for TicketNFT
│
├── frontend/                      # React + Vite frontend
│   ├── src/
│   │   ├── contexts/
│   │   │   └── WalletContext.jsx  # Wallet & contract provider
│   │   ├── abis/                  # Compiled contract ABIs
│   │   ├── pages/                 # App pages (Home, Events, etc.)
│   │   └── App.jsx                # Main app component
│   ├── index.html
│   └── vite.config.js             # Vite configuration

## Tech Stack

- Smart contracts: Solidity, Hardhat
- Frontend: React (Vite), TailwindCSS
- Web3: Ethers.js (browser provider + signer)
- Tooling: Node.js, NPM

## Prerequisites

- Node.js LTS (npm included)
- A Web3 wallet (e.g., MetaMask) for interacting with the dApp
- Access to an EVM-compatible network (testnet or local) and a funded account for deployments

## Getting Started

1) Clone and install dependencies

- Root (Hardhat and shared tooling):
  ```bash
  npm install
  ```
- Frontend:
  ```bash
  cd frontend
  npm install
  ```

2) Environment variables

- Root .env (used by Hardhat and deploy scripts). Create a `.env` at the repository root and add your values (do NOT commit secrets):
  ```env
  PRIVATE_KEY="<deployer_private_key>"            # Never use in frontend code
  # Optional convenience variables for docs/CI (do not use directly in frontend)
  TICKETNFT_DEPLOYED_ADDRESS="<address_after_deploy>"
  TICKETFACTORY_DEPLOYED_ADDRESS="<address_after_deploy>"
  ```

- Frontend env (Vite): Create `frontend/.env.local` (not committed) and add addresses actually used by the UI. Vite only exposes variables prefixed with `VITE_`:
  ```env
  VITE_TICKET_FACTORY_ADDRESS="<onchain_ticket_factory_address>"
  VITE_TICKET_NFT_ADDRESS="<onchain_ticket_nft_address>"
  VITE_TICKET_MARKETPLACE_ADDRESS="<onchain_ticket_marketplace_address>"
  ```

  Notes:
  - Vite reads env files from the frontend project root. Do not rely on the repository root `.env` for frontend values.
  - Contract addresses are public on-chain identifiers and safe to expose in the client. Do not place any private keys or secrets in frontend env files.

## Smart Contracts

- Build/compile:
  ```bash
  npx hardhat compile
  ```
- Test:
  ```bash
  npx hardhat test
  ```
- Deploy (example):
  ```bash
  # Update network in hardhat.config.js, then:
  npx hardhat run scripts/deploy-sei.js --network <your_network>
  ```

After deployment, copy emitted addresses into `frontend/.env.local` so the UI connects to the correct contracts.

Key files:
- <mcfile name="TicketNFT.sol" path="contracts/TicketNFT.sol"></mcfile>: ERC-721 NFT ticket implementation (minting, ownership, transfers)
- <mcfile name="TicketMarketplace.sol" path="contracts/TicketMarketplace.sol"></mcfile>: Listing and purchasing logic for tickets
- <mcfile name="deploy-sei.js" path="scripts/deploy-sei.js"></mcfile>: Example deployment script

## Frontend (Vite/React)

Development server:
```bash
cd frontend
npm run dev
```
This launches the app with hot reload. Ensure your MetaMask is on the same network as the deployed contracts.

Production build:
```bash
cd frontend
npm run build
npm run preview   # optional local preview
```

The frontend reads contract addresses via `import.meta.env` in <mcfile name="WalletContext.jsx" path="frontend/src/contexts/WalletContext.jsx"></mcfile>.

## Hosting Options

You can host the frontend as a static site. Popular options:

- Netlify (recommended for simplicity)
- Vercel
- GitHub Pages

### Deploy to Netlify

- Connect your GitHub repo in the Netlify dashboard.
- Build settings:
  - Base directory: `frontend`
  - Build command: `npm run build`
  - Publish directory: `dist`
- Environment variables (Site settings → Environment variables):
  - `VITE_TICKET_FACTORY_ADDRESS`, `VITE_TICKET_NFT_ADDRESS`, `VITE_TICKET_MARKETPLACE_ADDRESS`
- Trigger a deploy. Netlify will build and serve `dist`.

If Netlify’s security features warn about contract addresses in build output, you can configure the environment variables as non-secret or adjust your Netlify secrets scanning settings accordingly. Never place private keys in frontend env vars.

### Deploy to Vercel

- Import your GitHub repo in Vercel.
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables:
  - `VITE_TICKET_FACTORY_ADDRESS`, `VITE_TICKET_NFT_ADDRESS`, `VITE_TICKET_MARKETPLACE_ADDRESS`

### Deploy to GitHub Pages

- In `frontend`, add:
  ```bash
  npm install --save-dev gh-pages
  ```
- In `frontend/package.json` add a script:
  ```json
  {
    "scripts": {
      "deploy": "gh-pages -d dist"
    }
  }
  ```
- Build and deploy:
  ```bash
  cd frontend
  npm run build
  npm run deploy
  ```
- If your repo is not at the domain root, set `base` in <mcfile name="vite.config.js" path="frontend/vite.config.js"></mcfile> to `"/<repo-name>/"`.

## Usage

- Open the deployed site or local dev server.
- Connect wallet (MetaMask prompt).
- Mint/list/buy tickets as enabled by the UI and contract capabilities.

## Security Best Practices

- Never expose `PRIVATE_KEY` or any sensitive API keys in the frontend or committed files.
- Use environment variables correctly: only `VITE_*` keys are exposed to the browser build.
- Treat contract addresses as public; treat private keys and RPC credentials as secrets and keep them server-side or in CI secrets.

## Troubleshooting

- Wrong network or chain ID: Switch MetaMask to the target network used for deployment.
- "Contract not found" or calls failing: Verify addresses in `frontend/.env.local` match the latest deployment, and rebuild the frontend.
- Build failures on hosts: Ensure base dir/build command/publish dir are set correctly and env vars are present.
- Clearing caches: Delete `node_modules` and reinstall if dependency issues occur.

## Scripts & Commands (Quick Reference)

- Compile contracts: `npx hardhat compile`
- Run tests: `npx hardhat test`
- Deploy contracts: `npx hardhat run scripts/deploy-sei.js --network <network>`
- Frontend dev: `cd frontend && npm run dev`
- Frontend build: `cd frontend && npm run build`

## Contributing

- Fork the repo and create a feature branch.
- Follow existing code style and patterns.
- Open a PR with a clear description and screenshots where applicable.

## License

This project is provided under an open-source license. Add your preferred license text or file (for example, MIT) as needed.
