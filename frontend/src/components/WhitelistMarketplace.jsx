import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext.jsx';

function WhitelistMarketplace({ eventContract, marketplaceAddress }) {
  const [whitelistStatus, setWhitelistStatus] = useState({
    loading: false,
    success: false,
    error: null,
    isWhitelisted: false
  });

  // Check if marketplace is already whitelisted
  const checkWhitelistStatus = async () => {
    try {
      setWhitelistStatus(prev => ({ ...prev, loading: true }));
      const isWhitelisted = await eventContract.transferWhitelist(marketplaceAddress);
      setWhitelistStatus(prev => ({ 
        ...prev, 
        isWhitelisted,
        loading: false 
      }));
      return isWhitelisted;
    } catch (err) {
      console.error('Error checking whitelist status:', err);
      setWhitelistStatus(prev => ({ 
        ...prev, 
        error: 'Failed to check marketplace authorization status',
        loading: false 
      }));
      return false;
    }
  };

  // Check whitelist status when component mounts
  useEffect(() => {
    if (eventContract && marketplaceAddress) {
      checkWhitelistStatus();
    }
  }, [eventContract, marketplaceAddress]);

  // Whitelist the marketplace
  const handleWhitelistMarketplace = async () => {
    try {
      setWhitelistStatus(prev => ({ 
        ...prev, 
        loading: true,
        success: false,
        error: null 
      }));

      // Call the contract to whitelist the marketplace
      const tx = await eventContract.setTransferWhitelist(marketplaceAddress, true);
      await tx.wait();

      // Update status
      setWhitelistStatus(prev => ({ 
        ...prev, 
        loading: false,
        success: true,
        isWhitelisted: true 
      }));
    } catch (err) {
      console.error('Error whitelisting marketplace:', err);
      setWhitelistStatus(prev => ({ 
        ...prev, 
        loading: false,
        error: err.message || 'Failed to authorize marketplace for transfers' 
      }));
    }
  };

  // Remove marketplace from whitelist
  const handleRemoveWhitelist = async () => {
    try {
      setWhitelistStatus(prev => ({ 
        ...prev, 
        loading: true,
        success: false,
        error: null 
      }));

      // Call the contract to remove the marketplace from whitelist
      const tx = await eventContract.setTransferWhitelist(marketplaceAddress, false);
      await tx.wait();

      // Update status
      setWhitelistStatus(prev => ({ 
        ...prev, 
        loading: false,
        success: true,
        isWhitelisted: false 
      }));
    } catch (err) {
      console.error('Error removing marketplace from whitelist:', err);
      setWhitelistStatus(prev => ({ 
        ...prev, 
        loading: false,
        error: err.message || 'Failed to remove marketplace authorization' 
      }));
    }
  };

  return (
    <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-2">Marketplace Authorization</h3>
      <p className="text-sm mb-4">
        To enable ticket resale on the marketplace, you need to authorize the marketplace contract.
      </p>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm">
            Status: 
            <span className={`ml-1 font-medium ${whitelistStatus.isWhitelisted ? 'text-green-600' : 'text-red-600'}`}>
              {whitelistStatus.isWhitelisted ? 'Authorized' : 'Not Authorized'}
            </span>
          </p>
        </div>

        <div>
          {whitelistStatus.isWhitelisted ? (
            <button
              onClick={handleRemoveWhitelist}
              disabled={whitelistStatus.loading}
              className={`btn btn-secondary text-sm ${whitelistStatus.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {whitelistStatus.loading ? 'Processing...' : 'Remove Authorization'}
            </button>
          ) : (
            <button
              onClick={handleWhitelistMarketplace}
              disabled={whitelistStatus.loading}
              className={`btn btn-primary text-sm ${whitelistStatus.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {whitelistStatus.loading ? 'Processing...' : 'Authorize Marketplace'}
            </button>
          )}
        </div>
      </div>

      {whitelistStatus.success && (
        <div className="mt-3 text-sm text-green-600">
          Marketplace authorization updated successfully!
        </div>
      )}

      {whitelistStatus.error && (
        <div className="mt-3 text-sm text-red-600">
          {whitelistStatus.error}
        </div>
      )}
    </div>
  );
}

export default WhitelistMarketplace;