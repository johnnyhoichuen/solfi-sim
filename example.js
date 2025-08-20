#!/usr/bin/env node

import { simulate, SwapDirection } from './simulate.js';

async function main() {
    try {
        console.log('SolFi Simulator - Node.js Version');
        console.log('===================================');
        
        // Example 1: Simulate SOL to USDC swap (default 10 SOL)
        console.log('\n1. Simulating SOL to USDC swap (10 SOL):');
        const results1 = await simulate(
            SwapDirection.SOL_TO_USDC,
            10.0,
            null,
            false,
            true
        );
        
        // Example 2: Simulate USDC to SOL swap (1000 USDC)
        console.log('\n2. Simulating USDC to SOL swap (1000 USDC):');
        const results2 = await simulate(
            SwapDirection.USDC_TO_SOL,
            1000.0,
            null,
            false,
            true
        );
        
        // Example 3: Simulate with error handling
        console.log('\n3. Simulating with error handling:');
        const results3 = await simulate(
            SwapDirection.SOL_TO_USDC,
            5.0,
            null,
            true, // ignore errors
            false
        );
        
        console.log('\nResults summary:');
        console.log(`SOL->USDC: ${results1.length} results`);
        console.log(`USDC->SOL: ${results2.length} results`);
        console.log(`With error handling: ${results3.length} results`);
        
        // Show detailed results for first simulation
        if (results1.length > 0) {
            console.log('\nDetailed results for SOL->USDC:');
            results1.forEach(result => {
                if (result.error) {
                    console.log(`Market ${result.market}: ERROR - ${result.error}`);
                } else {
                    console.log(`Market ${result.market}: ${result.inAmount} SOL -> ${result.outAmount?.toFixed(6)} USDC`);
                }
            });
        }
        
    } catch (error) {
        console.error('Simulation failed:', error.message);
        process.exit(1);
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node example.js [options]

Options:
  --help, -h     Show this help message
  
This example demonstrates the Node.js version of the SolFi simulator.
It simulates swaps across multiple SolFi markets using a local SVM.

Note: This requires the 'data/' directory with account states and solfi.so program.
`);
    process.exit(0);
}

main().catch(console.error);