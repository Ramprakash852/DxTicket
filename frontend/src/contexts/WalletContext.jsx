import { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'
import TicketFactoryABI from '../abis/TicketFactory.json'
import TicketNFTABI from '../abis/TicketNFT.json'
import TicketMarketplaceABI from '../abis/TicketMarketplace.json'

// Contract addresses from environment variables
const TICKET_FACTORY_ADDRESS = "0xd57b614f888CFB1b35F12eEAd098Bc6bD5E06E00"
const TICKET_NFT_ADDRESS = "0xf90269Af0410f0Ed5DeceB3f052AB9310978d547"
const TICKET_MARKETPLACE_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3" // This will need to be updated after deployment


const WalletContext = createContext()

export function useWallet() {
  return useContext(WalletContext)
}

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null)
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [ticketFactory, setTicketFactory] = useState(null)
  const [ticketNFT, setTicketNFT] = useState(null)
  const [ticketMarketplace, setTicketMarketplace] = useState(null)
  const [error, setError] = useState(null)

  // Connect wallet function
  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        // Connect to MetaMask
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.send("eth_requestAccounts", [])
        const signer = await provider.getSigner()
        const { chainId } = await provider.getNetwork()
        
        // Set state
        setAccount(accounts[0])
        setProvider(provider)
        setSigner(signer)
        setChainId(chainId)
        setIsConnected(true)
        
        // Initialize contracts
        const ticketFactory = new ethers.Contract(
          TICKET_FACTORY_ADDRESS,
          TicketFactoryABI.abi,
          signer
        )
        
        const ticketNFT = new ethers.Contract(
          TICKET_NFT_ADDRESS,
          TicketNFTABI.abi,
          signer
        )

        const ticketMarketplace = new ethers.Contract(
          TICKET_MARKETPLACE_ADDRESS,
          TicketMarketplaceABI.abi,
          signer
        )
        
        setTicketFactory(ticketFactory)
        setTicketNFT(ticketNFT)
        setTicketMarketplace(ticketMarketplace)
        
        // Save connection state
        window.localStorage.setItem('walletConnected', 'true')
        
        return true
      } else {
        setError("Please install MetaMask or use a Web3 browser")
        return false
      }
    } catch (error) {
      console.error("Error connecting wallet:", error)
      setError(error.message || "Failed to connect wallet")
      return false
    }
  }

  // Disconnect wallet function
  const disconnectWallet = () => {
    setAccount(null)
    setProvider(null)
    setSigner(null)
    setChainId(null)
    setIsConnected(false)
    setTicketFactory(null)
    setTicketNFT(null)
    setTicketMarketplace(null)
    window.localStorage.removeItem('walletConnected')
  }

  // Get contract instance for a specific ticket NFT address
  const getTicketNFTContract = (address) => {
    if (!signer) return null
    return new ethers.Contract(address, TicketNFTABI.abi, signer)
  }

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          disconnectWallet()
        } else if (accounts[0] !== account) {
          // Account changed, update state
          setAccount(accounts[0])
        }
      }

      const handleChainChanged = () => {
        // Chain changed, refresh the page as recommended by MetaMask
        window.location.reload()
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [account])

  const value = {
    account,
    provider,
    signer,
    chainId,
    isConnected,
    ticketFactory,
    ticketNFT,
    ticketMarketplace,
    error,
    connectWallet,
    disconnectWallet,
    getTicketNFTContract
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}
