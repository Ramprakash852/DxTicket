import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { useWallet } from '../contexts/WalletContext.jsx'
import TicketFactoryABI from '../abis/TicketFactory.json'
import WhitelistMarketplace from '../components/WhitelistMarketplace.jsx'

function EventDetails() {
  const { address } = useParams()
  const { isConnected, account, signer, getTicketNFTContract, ticketMarketplace } = useWallet()
  
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseSuccess, setPurchaseSuccess] = useState(false)
  const [txHash, setTxHash] = useState('')
  
  // Organizer section states
  const [recipientAddress, setRecipientAddress] = useState('')
  const [minting, setMinting] = useState(false)
  const [mintSuccess, setMintSuccess] = useState(false)
  const [mintTxHash, setMintTxHash] = useState('')
  const [mintError, setMintError] = useState(null)
  
  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!isConnected || !address) {
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        setError(null)
        
        // Create contract instance for this event
        const eventContract = getTicketNFTContract(address)
        
        if (!eventContract) {
          throw new Error('Failed to load event contract')
        }
        
        // Get basic info about the event
        const name = await eventContract.name()
        const symbol = await eventContract.symbol()
        const ticketPrice = await eventContract.ticketPrice()
        const organizer = await eventContract.organizer()
        const nextTokenId = await eventContract.nextTokenId()
        
        setEvent({
          address,
          name,
          symbol,
          ticketPrice,
          ticketPriceFormatted: ethers.formatEther(ticketPrice),
          organizer,
          isOrganizer: account && organizer.toLowerCase() === account.toLowerCase(),
          nextTokenId: nextTokenId.toString(),
        })
      } catch (err) {
        console.error('Error fetching event details:', err)
        setError('Failed to load event details. Please try again later.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchEventDetails()
  }, [isConnected, address, account, getTicketNFTContract])
  
  const handlePurchaseTicket = async () => {
    if (!isConnected || !event) return
    
    try {
      setPurchasing(true)
      setError(null)
      
      const eventContract = getTicketNFTContract(address)
      
      // The contract doesn't have a public purchase function
      // The mint function is restricted to the contract owner only
      // We need to inform the user about this limitation
      
      setError('This NFT ticket can only be minted by the event organizer. Please contact the organizer to purchase a ticket.')
      setPurchasing(false)
      return
      
      /* This code would work if the contract had a public purchase function
      const tx = await eventContract.purchaseTicket({
        value: event.ticketPrice,
      })
      
      setTxHash(tx.hash)
      
      // Wait for transaction to be mined
      await tx.wait()
      
      setPurchaseSuccess(true)
      */
    } catch (err) {
      console.error('Error purchasing ticket:', err)
      setError(err.message || 'Failed to purchase ticket. Please try again.')
    } finally {
      setPurchasing(false)
    }
  }
  
  const handleMintTicket = async (e) => {
    e.preventDefault()
    if (!isConnected || !event || !event.isOrganizer) return
    
    // Basic validation
    if (!ethers.isAddress(recipientAddress)) {
      setMintError('Please enter a valid Ethereum address')
      return
    }
    
    try {
      setMinting(true)
      setMintError(null)
      setMintSuccess(false)
      
      const eventContract = getTicketNFTContract(address)
      
      // Generate a simple URI with event info
      // In a production app, you might want to use IPFS or another storage solution
      const tokenURI = JSON.stringify({
        name: `${event.name} Ticket`,
        description: `Ticket for ${event.name} event`,
        image: "https://example.com/ticket-image.png", // Placeholder image URL
        attributes: [
          {
            trait_type: "Event",
            value: event.name
          },
          {
            trait_type: "Price",
            value: event.ticketPriceFormatted
          }
        ]
      })
      
      // Call the mint function
      const tx = await eventContract.mint(recipientAddress, tokenURI)
      setMintTxHash(tx.hash)
      
      // Wait for transaction to be mined
      await tx.wait()
      
      setMintSuccess(true)
      setRecipientAddress('') // Clear the input field
    } catch (err) {
      console.error('Error minting ticket:', err)
      setMintError(err.message || 'Failed to mint ticket. Please try again.')
    } finally {
      setMinting(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="card bg-red-50 border border-red-200 text-red-700 p-4">
        <p>{error}</p>
        <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">
          &larr; Back to all events
        </Link>
      </div>
    )
  }
  
  if (!isConnected) {
    return (
      <div className="card text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Connect Wallet</h1>
        <p className="mb-6">Please connect your wallet to view event details.</p>
      </div>
    )
  }
  
  if (!event) {
    return (
      <div className="card text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
        <p className="mb-6">The event you're looking for doesn't exist or couldn't be loaded.</p>
        <Link to="/" className="btn btn-primary">
          Back to All Events
        </Link>
      </div>
    )
  }
  
  return (
    <div>
      <Link to="/" className="text-blue-600 hover:underline mb-6 inline-block">
        &larr; Back to all events
      </Link>
      
      {purchaseSuccess ? (
        <div className="card bg-green-50 border border-green-200">
          <div className="text-center py-6">
            <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <h2 className="text-xl font-bold text-green-800 mb-2">Ticket Purchased Successfully!</h2>
            <p className="mb-4">Your ticket has been purchased and is now available in your wallet.</p>
            <p className="text-sm text-gray-600 mb-4">
              Transaction Hash: <a href={`https://explorer.sei.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{txHash}</a>
            </p>
            <Link to="/my-tickets" className="btn btn-primary">
              View My Tickets
            </Link>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
            <p className="text-gray-600">Symbol: {event.symbol}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Event Details</h2>
              <div className="space-y-3">
                <p><span className="font-medium">Organizer:</span> {event.organizer}</p>
                <p><span className="font-medium">Ticket Price:</span> {event.ticketPriceFormatted} ETH</p>
                <p><span className="font-medium">Tickets Sold:</span> {event.nextTokenId}</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Purchase Ticket</h2>
              <p className="mb-4">Secure your spot at this event by purchasing an NFT ticket.</p>
              <p className="text-lg font-bold mb-6">{event.ticketPriceFormatted} ETH</p>
              
              <button
                onClick={handlePurchaseTicket}
                disabled={purchasing || event.isOrganizer}
                className={`btn btn-primary w-full ${(purchasing || event.isOrganizer) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {purchasing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : event.isOrganizer ? (
                  'You are the organizer'
                ) : (
                  'Purchase Ticket'
                )}
              </button>
              
              {event.isOrganizer && (
                <p className="text-sm text-gray-600 mt-2">As the organizer, you cannot purchase tickets for your own event.</p>
              )}
            </div>
          </div>
          
          {/* Organizer Section */}
          {event.isOrganizer && (
            <div className="mt-8 border-t pt-6">
              <h2 className="text-xl font-semibold mb-4">Organizer Controls</h2>
              
              {/* Marketplace Authorization Section */}
              {ticketMarketplace && (
                <div className="mb-6">
                  <WhitelistMarketplace 
                    eventContract={getTicketNFTContract(address)} 
                    marketplaceAddress={ticketMarketplace.target} 
                  />
                </div>
              )}
              
              {!ticketMarketplace && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2">Marketplace Authorization</h3>
                  <p className="text-sm">
                    Unable to load marketplace contract. Ticket resale functionality is not available.
                  </p>
                </div>
              )}
              
              {mintSuccess ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="text-center py-2">
                    <svg className="w-8 h-8 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <h3 className="text-lg font-bold text-green-800 mb-1">Ticket Minted Successfully!</h3>
                    <p className="text-sm mb-2">The ticket has been minted to the recipient's address.</p>
                    <p className="text-xs text-gray-600 mb-2">
                      Transaction Hash: <a href={`https://explorer.sei.io/tx/${mintTxHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{mintTxHash}</a>
                    </p>
                    <button 
                      onClick={() => setMintSuccess(false)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Mint another ticket
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleMintTicket} className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <p className="mb-4">As the event organizer, you can mint tickets directly to attendees' wallets.</p>
                  
                  {mintError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4">
                      <p className="text-sm">{mintError}</p>
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <label htmlFor="recipientAddress" className="block text-sm font-medium text-gray-700 mb-1">
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      id="recipientAddress"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">Ticket Price: <span className="font-medium">{event.ticketPriceFormatted} ETH</span></p>
                    </div>
                    <button
                      type="submit"
                      disabled={minting}
                      className={`btn btn-primary ${minting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {minting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Minting...
                        </>
                      ) : (
                        'Mint Ticket'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default EventDetails