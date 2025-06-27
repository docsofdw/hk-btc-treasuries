import { describe, it, expect } from '@jest/globals';
import { extractBitcoinInfo, determineFilingType } from '../lib/parsers/bitcoin-extractor';

describe('Bitcoin Amount Extraction', () => {
  describe('Acquisition patterns', () => {
    const acquisitionTestCases = [
      {
        name: 'HKEX acquisition announcement',
        text: 'The Company is pleased to announce that it has purchased 100 Bitcoin for a total consideration of $4.5 million.',
        expected: { btcDelta: 100, btcTotal: null, isDisposal: false }
      },
      {
        name: 'Simple acquisition with BTC abbreviation',
        text: 'We acquired 250 BTC during the quarter.',
        expected: { btcDelta: 250, btcTotal: null, isDisposal: false }
      },
      {
        name: 'Bought with comma formatting',
        text: 'The entity bought 1,500 Bitcoin as treasury reserve.',
        expected: { btcDelta: 1500, btcTotal: null, isDisposal: false }
      },
      {
        name: 'Decimal amount purchase',
        text: 'Purchased 75.5 BTC through market maker.',
        expected: { btcDelta: 75.5, btcTotal: null, isDisposal: false }
      }
    ];

    acquisitionTestCases.forEach(({ name, text, expected }) => {
      it(name, () => {
        const result = extractBitcoinInfo(text);
        expect(result).toEqual(expected);
      });
    });
  });

  describe('Disposal patterns', () => {
    const disposalTestCases = [
      {
        name: 'SEC disposal filing',
        text: 'During Q3 2024, we sold 50 BTC to fund operations.',
        expected: { btcDelta: -50, btcTotal: null, isDisposal: true }
      },
      {
        name: 'Disposal with "disposed of" phrase',
        text: 'The company disposed of 25 Bitcoin in the reporting period.',
        expected: { btcDelta: -25, btcTotal: null, isDisposal: true }
      },
      {
        name: 'Divestment announcement',
        text: 'Management divested 200 BTC as part of portfolio rebalancing.',
        expected: { btcDelta: -200, btcTotal: null, isDisposal: true }
      },
      {
        name: 'Comma-formatted disposal',
        text: 'The board approved the sale of 1,250 Bitcoin.',
        expected: { btcDelta: -1250, btcTotal: null, isDisposal: true }
      }
    ];

    disposalTestCases.forEach(({ name, text, expected }) => {
      it(name, () => {
        const result = extractBitcoinInfo(text);
        expect(result).toEqual(expected);
      });
    });
  });

  describe('Total holdings patterns', () => {
    const holdingsTestCases = [
      {
        name: 'Total holdings update',
        text: 'As of December 31, 2023, the Company now holds 2,741 Bitcoin.',
        expected: { btcDelta: null, btcTotal: 2741, isDisposal: false }
      },
      {
        name: 'Current holdings statement',
        text: 'Current holdings: 850 BTC as of quarter end.',
        expected: { btcDelta: null, btcTotal: 850, isDisposal: false }
      },
      {
        name: 'Total BTC holdings format',
        text: 'Total BTC holdings of 425.75 at reporting date.',
        expected: { btcDelta: null, btcTotal: 425.75, isDisposal: false }
      },
      {
        name: 'Large formatted holdings',
        text: 'The fund now holds 15,000 Bitcoin in custody.',
        expected: { btcDelta: null, btcTotal: 15000, isDisposal: false }
      }
    ];

    holdingsTestCases.forEach(({ name, text, expected }) => {
      it(name, () => {
        const result = extractBitcoinInfo(text);
        expect(result).toEqual(expected);
      });
    });
  });

  describe('Complex scenarios', () => {
    it('should prioritize specific transaction over general mentions', () => {
      const text = 'We hold 1000 Bitcoin total. During the quarter, we purchased 100 additional BTC.';
      const result = extractBitcoinInfo(text);
      expect(result).toEqual({ btcDelta: 100, btcTotal: 1000, isDisposal: false });
    });

    it('should handle multiple amounts and pick the largest for general mentions', () => {
      const text = 'Portfolio includes 50 BTC, with an additional 200 Bitcoin, representing total exposure to digital assets.';
      const result = extractBitcoinInfo(text);
      expect(result).toEqual({ btcDelta: null, btcTotal: 200, isDisposal: false });
    });

    it('should handle no Bitcoin mentions', () => {
      const text = 'This document discusses corporate governance and regulatory compliance.';
      const result = extractBitcoinInfo(text);
      expect(result).toEqual({ btcDelta: null, btcTotal: null, isDisposal: false });
    });

    it('should handle case-insensitive matching', () => {
      const text = 'The company PURCHASED 75 BITCOIN during Q4.';
      const result = extractBitcoinInfo(text);
      expect(result).toEqual({ btcDelta: 75, btcTotal: null, isDisposal: false });
    });
  });
});

describe('Filing Type Determination', () => {
  const filingTypeTestCases = [
    {
      name: 'should classify acquisition with positive delta',
      btcDelta: 100,
      btcTotal: null,
      isDisposal: false,
      expected: 'acquisition'
    },
    {
      name: 'should classify disposal with negative delta',
      btcDelta: -50,
      btcTotal: null,
      isDisposal: true,
      expected: 'disposal'
    },
    {
      name: 'should classify update with total holdings',
      btcDelta: null,
      btcTotal: 1000,
      isDisposal: false,
      expected: 'update'
    },
    {
      name: 'should classify disclosure with no specific amounts',
      btcDelta: null,
      btcTotal: null,
      isDisposal: false,
      expected: 'disclosure'
    },
    {
      name: 'should prioritize delta over total when both present',
      btcDelta: 200,
      btcTotal: 1500,
      isDisposal: false,
      expected: 'acquisition'
    }
  ];

  filingTypeTestCases.forEach(({ name, btcDelta, btcTotal, isDisposal, expected }) => {
    it(name, () => {
      const result = determineFilingType(btcDelta, btcTotal, isDisposal);
      expect(result).toBe(expected);
    });
  });
});

describe('Edge cases and robustness', () => {
  it('should handle malformed text gracefully', () => {
    const malformedTexts = [
      '',
      'bitcoin',
      '100',
      'purchased bitcoin',
      'BTC 50',
      '   bitcoin   ',
    ];

    malformedTexts.forEach(text => {
      expect(() => extractBitcoinInfo(text)).not.toThrow();
    });
  });

  it('should handle very large numbers', () => {
    const text = 'The treasury acquired 999,999.9999 BTC.';
    const result = extractBitcoinInfo(text);
    expect(result.btcDelta).toBe(999999.9999);
  });

  it('should handle zero amounts', () => {
    const text = 'No Bitcoin were purchased (0 BTC).';
    const result = extractBitcoinInfo(text);
    expect(result.btcDelta).toBe(0);
  });

  it('should handle scientific notation gracefully', () => {
    const text = 'Holdings include 1e2 Bitcoin.';
    const result = extractBitcoinInfo(text);
    // Should not parse scientific notation as valid
    expect(result.btcDelta).toBeNull();
    expect(result.btcTotal).toBeNull();
  });
}); 