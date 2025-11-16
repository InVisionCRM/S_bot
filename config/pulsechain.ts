/**
 * PulseChain Configuration
 * Contains addresses, RPC endpoints, and network constants
 */

export const PULSECHAIN_CONFIG = {
  // PulseChain Mainnet Chain ID
  chainId: 369,
  
  // RPC Endpoints (you can add more or use your own node)
  rpcUrls: {
    primary: process.env.NEXT_PUBLIC_PULSECHAIN_RPC_URL || 'https://rpc.pulsechain.com',
    fallback: 'https://pulsechain.publicnode.com',
  },
  
  // Block Explorer
  blockExplorer: 'https://scan.pulsechain.com',
  
  // Factory Contract Addresses
  factories: {
    v1: '0x1715a3E4A142d8b698131108995174F37aEBA10D' as const,
    v2: '0x29eA7545DEf87022BAdc76323F373EA1e707C523' as const,
  },
  
  // Watched Address
  watchedAddress: '0x6538A83a81d855B965983161AF6a83e616D16fD5' as const,
  
  // Polling interval in milliseconds (default: 12 seconds for PulseChain blocks)
  pollingInterval: 12000,
  
  // Block confirmation threshold
  confirmations: 1,
} as const;

/**
 * UniswapV2 Factory ABI (PulseX uses similar pattern)
 * PairCreated event signature
 */
export const FACTORY_ABI = [
  'event PairCreated(address indexed token0, address indexed token1, address pair, uint256)',
  'function allPairsLength() external view returns (uint256)',
  'function allPairs(uint256) external view returns (address)',
] as const;

/**
 * ERC20 Token ABI (minimal for basic info)
 */
export const ERC20_ABI = [
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address) external view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
] as const;

