import { PublicKey } from '@solana/web3.js';

// Constants from the Rust implementation
export const DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com";

export const SOLFI_PROGRAM = new PublicKey("SoLFiHG9TfgtdUXUjWAxi3LtvYuFyDLVhBWxdMZxyCe");
export const WSOL = new PublicKey("So11111111111111111111111111111111111111112");
export const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

export const SOLFI_MARKETS = [
    new PublicKey("5guD4Uz462GT4Y4gEuqyGsHZ59JGxFN4a3rF6KWguMcJ"),
    new PublicKey("DH4xmaWDnTzKXehVaPSNy9tMKJxnYL5Mo5U3oTHFtNYJ"),
    new PublicKey("AHhiY6GAKfBkvseQDQbBC7qp3fTRNpyZccuEdYSdPFEf"),
    new PublicKey("CAPhoEse9xEH95XmdnJjYrZdNCA8xfUWdy3aWymHa1Vj"),
];

export const DEFAULT_SWAP_AMOUNT_SOL = 10.0;
export const DEFAULT_SWAP_AMOUNT_USDC = 1000.0;
export const SOL_DECIMALS = 9;
export const USDC_DECIMALS = 6;