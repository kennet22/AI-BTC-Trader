import React, { createContext, useState, useContext, useEffect } from 'react';

const CryptoContext = createContext();

export function CryptoProvider({ children }) {
  const [selectedCryptoAsset, setSelectedCryptoAsset] = useState('BTC');
  const [isChangingCrypto, setIsChangingCrypto] = useState(false);
  
  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCrypto = localStorage.getItem('selectedCryptoAsset');
      if (savedCrypto) {
        setSelectedCryptoAsset(savedCrypto);
      }
    }
  }, []);
  
  // Save to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedCryptoAsset', selectedCryptoAsset);
    }
  }, [selectedCryptoAsset]);
  
  const handleCryptoAssetChange = (asset) => {
    if (asset !== selectedCryptoAsset) {
      setIsChangingCrypto(true);
      setSelectedCryptoAsset(asset);
      
      // Reset the loading state after a short delay
      setTimeout(() => {
        setIsChangingCrypto(false);
      }, 500);
    }
  };
  
  return (
    <CryptoContext.Provider 
      value={{ 
        selectedCryptoAsset, 
        setSelectedCryptoAsset,
        handleCryptoAssetChange,
        isChangingCrypto
      }}
    >
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto() {
  return useContext(CryptoContext);
} 