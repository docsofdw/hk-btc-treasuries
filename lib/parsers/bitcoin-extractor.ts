interface BitcoinInfo {
  btcDelta: number | null;
  btcTotal: number | null;
  isDisposal: boolean;
}

export function extractBitcoinInfo(text: string): BitcoinInfo {
  // Patterns for different types of Bitcoin mentions
  const patterns = {
    // Acquisitions
    purchased: /(?:purchased?|acquired?|bought)\s+(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|btc)/gi,
    
    // Disposals (negative)
    sold: /(?:sold|disposed?\s+of|divested)\s+(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|btc)/gi,
    
    // Total holdings
    totalHoldings: /(?:total\s+(?:bitcoin|btc)\s+holdings?|now\s+holds?|current\s+holdings?)\s*(?:of|:)?\s*(\d+(?:,\d{3})*(?:\.\d+)?)/gi,
    
    // Alternative patterns
    btcAmount: /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|btc)/gi,
  };
  
  let btcDelta = null;
  let btcTotal = null;
  let isDisposal = false;
  
  // Check for specific transaction types first
  const disposalMatch = text.match(patterns.sold);
  if (disposalMatch && disposalMatch.length > 0) {
    const match = disposalMatch[0].match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
    if (match) {
      btcDelta = -parseFloat(match[1].replace(/,/g, ''));
      isDisposal = true;
    }
  }
  
  if (!btcDelta) {
    const acquisitionMatch = text.match(patterns.purchased);
    if (acquisitionMatch && acquisitionMatch.length > 0) {
      const match = acquisitionMatch[0].match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
      if (match) {
        btcDelta = parseFloat(match[1].replace(/,/g, ''));
      }
    }
  }
  
  // Check for total holdings
  const totalMatch = text.match(patterns.totalHoldings);
  if (totalMatch && totalMatch.length > 0) {
    const match = totalMatch[0].match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
    if (match) {
      btcTotal = parseFloat(match[1].replace(/,/g, ''));
    }
  }
  
  // If no specific patterns found, look for any Bitcoin amounts
  if (!btcDelta && !btcTotal) {
    const amountMatches = [...text.matchAll(patterns.btcAmount)];
    if (amountMatches.length > 0) {
      // Use the largest amount found as it's likely the most relevant
      const amounts = amountMatches.map(match => parseFloat(match[1].replace(/,/g, '')));
      btcTotal = Math.max(...amounts);
    }
  }
  
  return { btcDelta, btcTotal, isDisposal };
}

export function determineFilingType(btcDelta: number | null, btcTotal: number | null, isDisposal: boolean): string {
  if (btcDelta) {
    return isDisposal ? 'disposal' : 'acquisition';
  } else if (btcTotal) {
    return 'update';
  }
  return 'disclosure';
} 