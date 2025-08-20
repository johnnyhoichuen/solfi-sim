# SolFi Simulator - Node.js Version

A minimal Node.js port of the Rust SolFi simulator that uses a local Solana Virtual Machine (SVM) to simulate WSOL/USDC swaps across SolFi markets.

## Features

- **Local SVM Simulation**: Uses `solana-bankrun` (Node.js equivalent of LiteSVM) for local transaction simulation
- **Real Transaction Execution**: Actually executes swap transactions in a simulated environment
- **Multiple Markets**: Simulates across all 4 SolFi WSOL/USDC markets
- **Bidirectional Swaps**: Supports both SOL→USDC and USDC→SOL swaps
- **Account State Loading**: Loads pre-fetched account states from JSON files

## Installation

```bash
npm install
```

## Dependencies

- `@solana/web3.js` - Solana JavaScript SDK
- `@solana/spl-token` - SPL Token utilities
- `@solana/spl-associated-token-account` - Associated token account utilities
- `solana-bankrun` - Local Solana Virtual Machine for testing

## Usage

### Basic Usage

```javascript
import { simulate, SwapDirection } from './simulate.js';

// Simulate 10 SOL to USDC swap
const results = await simulate(
    SwapDirection.SOL_TO_USDC,
    10.0,           // amount
    null,           // slot (optional)
    false,          // ignore errors
    true            // print results
);

// Simulate 1000 USDC to SOL swap
const results2 = await simulate(
    SwapDirection.USDC_TO_SOL,
    1000.0,
    null,
    false,
    true
);
```

### Command Line Example

```bash
node example.js
```

### Parameters

- `direction`: `SwapDirection.SOL_TO_USDC` or `SwapDirection.USDC_TO_SOL`
- `amount`: Amount to swap (defaults: 10 SOL or 1000 USDC)
- `slot`: Optional slot number (not used in current implementation)
- `ignoreErrors`: Whether to ignore transaction errors
- `print`: Whether to print results to console

## Data Requirements

The simulator expects the following data structure:

```
data/
├── solfi.so                    # SolFi program binary
├── account_[pubkey].json       # Account state files
└── ...
```

Account JSON files should have the format:
```json
{
  "address": "5guD4Uz462GT4Y4gEuqyGsHZ59JGxFN4a3rF6KWguMcJ",
  "account": {
    "lamports": 1000000,
    "data": [/* account data bytes */],
    "owner": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "executable": false,
    "rentEpoch": 0
  }
}
```

## How It Works

1. **SVM Setup**: Creates a local Solana Virtual Machine using `solana-bankrun`
2. **Program Loading**: Loads the SolFi program from `data/solfi.so`
3. **Account Loading**: Loads all account states from JSON files in `data/`
4. **User Setup**: Creates a user keypair and funds it appropriately
5. **Transaction Simulation**: For each market:
   - Creates associated token accounts
   - Wraps SOL if needed (for SOL→USDC swaps)
   - Executes the swap instruction
   - Measures balance changes

## Key Differences from Rust Version

- Uses `solana-bankrun` instead of `LiteSVM`
- JavaScript/Node.js instead of Rust
- Async/await pattern for all operations
- JSON file loading instead of Rust serialization

## SolFi Markets

The simulator operates on these 4 SolFi WSOL/USDC markets:
- `5guD4Uz462GT4Y4gEuqyGsHZ59JGxFN4a3rF6KWguMcJ`
- `DH4xmaWDnTzKXehVaPSNy9tMKJxnYL5Mo5U3oTHFtNYJ`
- `AHhiY6GAKfBkvseQDQbBC7qp3fTRNpyZccuEdYSdPFEf`
- `CAPhoEse9xEH95XmdnJjYrZdNCA8xfUWdy3aWymHa1Vj`

## Error Handling

The simulator handles errors gracefully:
- Transaction failures are captured and reported
- Invalid account states are skipped with warnings
- Missing data files are handled gracefully

## Limitations

- Requires pre-fetched account states and program binary
- No built-in account fetching (use the Rust version for that)
- Simplified token account creation (may need adjustment for production use)

## Example Output

```
5guD4Uz462GT4Y4gEuqyGsHZ59JGxFN4a3rF6KWguMcJ,10.0,1296.914489,
DH4xmaWDnTzKXehVaPSNy9tMKJxnYL5Mo5U3oTHFtNYJ,10.0,1296.876372,
AHhiY6GAKfBkvseQDQbBC7qp3fTRNpyZccuEdYSdPFEf,10.0,1296.753182,
CAPhoEse9xEH95XmdnJjYrZdNCA8xfUWdy3aWymHa1Vj,10.0,1296.762879,
```

Format: `market_address,input_amount,output_amount,error`