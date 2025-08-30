import { useState } from 'react'
import { useWallet } from '../contexts/WalletContext.jsx'

function VerifyTicket() {
  const { isConnected, getTicketNFTContract } = useWallet()
  
  const [scanMode, setScanMode] = useState(false)
  const [ticketData, setTicketData] = useState(null)
  const [verificationResult, setVerificationResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [manualInput, setManualInput] = useState({
    eventAddress: '',
    tokenId: ''
  })
  
  const handleManualInputChange = (e) => {
    const { name, value } = e.target
    setManualInput(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  const handleManualVerify = async (e) => {
    e.preventDefault()
    
    if (!manualInput.eventAddress || !manualInput.tokenId) {
      setError('Please enter both event address and token ID')
      return
    }
    
    try {
      const data = {
        eventAddress: manualInput.eventAddress,
        tokenId: parseInt(manualInput.tokenId)
      }
      await verifyTicket(data)
    } catch (err) {
      setError('Invalid input format')
    }
  }
  
  const handleScan = (data) => {
    if (data) {
      try {
        // Parse the QR code data
        const parsedData = JSON.parse(data)
        setTicketData(parsedData)
        setScanMode(false)
        verifyTicket(parsedData)
      } catch (err) {
        setError('Invalid QR code format')
      }
    }
  }
  
  const handleError = (err) => {
    console.error(err)
    setError('Error scanning QR code')
  }
  
  const verifyTicket = async (data) => {
    setLoading(true)
    setError(null)
    setVerificationResult(null)
    
    try {
      const { eventAddress, tokenId } = data
      
      // Get the event contract
      const eventContract = getTicketNFTContract(eventAddress)
      
      if (!eventContract) {
        throw new Error('Invalid event address')
      }
      
      // Check if the ticket exists
      try {
        const owner = await eventContract.ownerOf(tokenId)
        
        // Check if the ticket has been used
        const isUsed = await eventContract.usedTickets(tokenId)
        
        if (isUsed) {
          setVerificationResult({
            valid: false,
            message: 'Ticket has already been used',
            details: {
              eventAddress,
              tokenId,
              owner
            }
          })
        } else {
          setVerificationResult({
            valid: true,
            message: 'Ticket is valid',
            details: {
              eventAddress,
              tokenId,
              owner
            }
          })
        }
      } catch (err) {
        setVerificationResult({
          valid: false,
          message: 'Ticket does not exist',
          details: {
            eventAddress,
            tokenId
          }
        })
      }
    } catch (err) {
      console.error('Error verifying ticket:', err)
      setError(err.message || 'Failed to verify ticket')
    } finally {
      setLoading(false)
    }
  }
  
  const markTicketAsUsed = async () => {
    if (!verificationResult || !verificationResult.valid) return
    
    setLoading(true)
    setError(null)
    
    try {
      const { eventAddress, tokenId } = verificationResult.details
      
      // Get the event contract
      const eventContract = getTicketNFTContract(eventAddress)
      
      // Mark the ticket as used
      const tx = await eventContract.markTicketUsed(tokenId)
      
      // Wait for transaction to be mined
      await tx.wait()
      
      // Update verification result
      setVerificationResult({
        ...verificationResult,
        valid: false,
        message: 'Ticket has been marked as used',
        txHash: tx.hash
      })
    } catch (err) {
      console.error('Error marking ticket as used:', err)
      setError(err.message || 'Failed to mark ticket as used')
    } finally {
      setLoading(false)
    }
  }
  
  const resetVerification = () => {
    setTicketData(null)
    setVerificationResult(null)
    setError(null)
    setManualInput({
      eventAddress: '',
      tokenId: ''
    })
  }
  
  if (!isConnected) {
    return (
      <div className="card text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Connect Wallet</h1>
        <p className="mb-6">Please connect your wallet to verify tickets.</p>
      </div>
    )
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Verify Ticket</h1>
      
      {scanMode ? (
        <div className="card text-center py-8">
          <h2 className="text-xl font-semibold mb-4">Scan QR Code</h2>
          <p className="mb-6">Position the QR code in the center of the camera.</p>
          
          <div className="flex justify-center mb-6">
            <div className="w-64 h-64 border-4 border-blue-500 relative">
              <p className="absolute inset-0 flex items-center justify-center text-gray-500">
                QR Scanner would appear here
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Note: In a production app, this would use a QR code scanner library
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setScanMode(false)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      ) : verificationResult ? (
        <div className="card">
          <div className="text-center py-6">
            {verificationResult.valid ? (
              <>
                <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <h2 className="text-xl font-bold text-green-800 mb-2">Valid Ticket</h2>
              </>
            ) : (
              <>
                <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                <h2 className="text-xl font-bold text-red-800 mb-2">Invalid Ticket</h2>
              </>
            )}
            
            <p className="mb-6">{verificationResult.message}</p>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
              <h3 className="font-medium mb-2">Ticket Details:</h3>
              <p><span className="font-medium">Event Address:</span> {verificationResult.details.eventAddress}</p>
              <p><span className="font-medium">Token ID:</span> {verificationResult.details.tokenId}</p>
              {verificationResult.details.owner && (
                <p><span className="font-medium">Owner:</span> {verificationResult.details.owner}</p>
              )}
              {verificationResult.txHash && (
                <p className="mt-2">
                  <span className="font-medium">Transaction:</span> 
                  <a 
                    href={`https://explorer.sei.io/tx/${verificationResult.txHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {verificationResult.txHash}
                  </a>
                </p>
              )}
            </div>
            
            <div className="flex justify-center space-x-4">
              {verificationResult.valid && (
                <button 
                  onClick={markTicketAsUsed}
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? 'Processing...' : 'Mark as Used'}
                </button>
              )}
              
              <button 
                onClick={resetVerification}
                className="btn btn-secondary"
              >
                Verify Another Ticket
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Scan QR Code</h2>
            <p className="mb-6">Scan the QR code on the ticket to verify its authenticity.</p>
            
            <button 
              onClick={() => setScanMode(true)}
              className="btn btn-primary w-full"
            >
              Open Scanner
            </button>
          </div>
          
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Manual Verification</h2>
            <p className="mb-4">Enter the ticket details manually.</p>
            
            <form onSubmit={handleManualVerify}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2" htmlFor="eventAddress">
                  Event Address
                </label>
                <input
                  type="text"
                  id="eventAddress"
                  name="eventAddress"
                  value={manualInput.eventAddress}
                  onChange={handleManualInputChange}
                  className="input"
                  placeholder="0x..."
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2" htmlFor="tokenId">
                  Token ID
                </label>
                <input
                  type="number"
                  id="tokenId"
                  name="tokenId"
                  value={manualInput.tokenId}
                  onChange={handleManualInputChange}
                  className="input"
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
              
              <button 
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? 'Verifying...' : 'Verify Ticket'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default VerifyTicket