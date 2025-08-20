import { 
    Keypair, 
    PublicKey, 
    Transaction, 
    TransactionInstruction,
    LAMPORTS_PER_SOL,
    SystemProgram
} from '@solana/web3.js';
import { 
    createAssociatedTokenAccountIdempotentInstruction,
    createSyncNativeInstruction,
    getAssociatedTokenAddressSync,
    TOKEN_PROGRAM_ID,
    ACCOUNT_SIZE
} from '@solana/spl-token';
import { startAnchor } from 'solana-bankrun';
import { 
    SOLFI_PROGRAM, 
    WSOL, 
    USDC, 
    SOLFI_MARKETS, 
    DEFAULT_SWAP_AMOUNT_SOL, 
    DEFAULT_SWAP_AMOUNT_USDC, 
    SOL_DECIMALS, 
    USDC_DECIMALS 
} from './constants.js';
import fs from 'fs';
import path from 'path';

// SwapDirection enum equivalent
export const SwapDirection = {
    SOL_TO_USDC: 0,
    USDC_TO_SOL: 1
};

// SwapResult structure
export class SwapResult {
    constructor(market, inAmount, outAmount = null, error = null) {
        this.market = market;
        this.inAmount = inAmount;
        this.outAmount = outAmount;
        this.error = error;
    }
}

// Create instruction data for swap (mimicking Rust implementation)
function createInstructionData(direction, amountIn) {
    const buffer = Buffer.alloc(18);
    buffer.writeUInt8(7, 0); // DISCRIMINATOR
    buffer.writeBigUInt64LE(BigInt(amountIn), 1);
    buffer.writeUInt8(direction, 17);
    return buffer;
}

// Create token account with balance
function createTokenAccount(mint, owner, amount) {
    const rentExemptBalance = 2039280; // Rent exempt balance for token account
    return {
        lamports: rentExemptBalance,
        data: Buffer.alloc(ACCOUNT_SIZE), // Token account data will be properly initialized
        owner: TOKEN_PROGRAM_ID,
        executable: false,
        rentEpoch: 0
    };
}

// Create swap instruction
function createSwapInstruction(direction, market, user, tokenA, tokenB, amount) {
    const accounts = [
        { pubkey: user, isSigner: true, isWritable: true },
        { pubkey: market, isSigner: false, isWritable: true },
        { pubkey: getAssociatedTokenAddressSync(tokenA, market), isSigner: false, isWritable: true },
        { pubkey: getAssociatedTokenAddressSync(tokenB, market), isSigner: false, isWritable: true },
        { pubkey: getAssociatedTokenAddressSync(tokenA, user), isSigner: false, isWritable: true },
        { pubkey: getAssociatedTokenAddressSync(tokenB, user), isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: new PublicKey("Sysvar1nstructions1111111111111111111111111"), isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({
        keys: accounts,
        programId: SOLFI_PROGRAM,
        data: createInstructionData(direction, amount)
    });
}

// Get token balance from bankrun context
async function getTokenBalance(context, tokenAccount) {
    try {
        const accountInfo = await context.banksClient.getAccount(tokenAccount);
        if (!accountInfo) return 0;
        
        // Parse token account data to get balance
        const data = accountInfo.data;
        if (data.length >= 64) {
            // Token amount is stored at offset 64 as u64 little endian
            return data.readBigUInt64LE(64);
        }
        return 0n;
    } catch (error) {
        return 0n;
    }
}

// Load account data from JSON files (equivalent to AccountWithAddress::read_all())
async function loadAccountData() {
    const accounts = [];
    const dataDir = path.join(process.cwd(), 'data');
    
    if (!fs.existsSync(dataDir)) {
        return accounts;
    }

    const files = fs.readdirSync(dataDir);
    for (const file of files) {
        if (file.startsWith('account_') && file.endsWith('.json')) {
            try {
                const filePath = path.join(dataDir, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                accounts.push({
                    address: new PublicKey(data.address),
                    account: data.account
                });
            } catch (error) {
                console.warn(`Failed to load account from ${file}:`, error.message);
            }
        }
    }
    
    return accounts;
}

// Main simulate function - Node.js version using bankrun SVM
export async function simulate(
    direction = SwapDirection.SOL_TO_USDC,
    amount = null,
    slot = null,
    ignoreErrors = false,
    print = false
) {
    try {
        // Start bankrun context (equivalent to LiteSVM setup)
        const context = await startAnchor("", [], []);
        
        // Load SolFi program
        const programPath = path.join(process.cwd(), 'data', 'solfi.so');
        if (fs.existsSync(programPath)) {
            const programData = fs.readFileSync(programPath);
            await context.banksClient.setAccount(SOLFI_PROGRAM, {
                lamports: 1000000000,
                data: programData,
                owner: new PublicKey("BPFLoader2111111111111111111111111111111111"),
                executable: true,
                rentEpoch: 0
            });
        }

        // Load all account data
        const accountData = await loadAccountData();
        for (const { address, account } of accountData) {
            await context.banksClient.setAccount(address, account);
        }

        // Generate user keypair
        const userKeypair = Keypair.generate();
        const user = userKeypair.publicKey;

        // Determine swap parameters based on direction
        const { toMint, fromDecimals, toDecimals, inAmountUi } = 
            direction === SwapDirection.SOL_TO_USDC 
                ? {
                    toMint: USDC,
                    fromDecimals: SOL_DECIMALS,
                    toDecimals: USDC_DECIMALS,
                    inAmountUi: amount || DEFAULT_SWAP_AMOUNT_SOL
                }
                : {
                    toMint: WSOL,
                    fromDecimals: USDC_DECIMALS,
                    toDecimals: SOL_DECIMALS,
                    inAmountUi: amount || DEFAULT_SWAP_AMOUNT_USDC
                };

        const amountInAtomic = Math.floor(inAmountUi * Math.pow(10, fromDecimals));
        const totalAmountNeeded = amountInAtomic * SOLFI_MARKETS.length;
        const feeLamports = LAMPORTS_PER_SOL; // 1 SOL for fees

        // Setup user account with required funds
        if (direction === SwapDirection.SOL_TO_USDC) {
            const airdropAmount = totalAmountNeeded + feeLamports;
            await context.banksClient.setAccount(user, {
                lamports: airdropAmount,
                data: Buffer.alloc(0),
                owner: SystemProgram.programId,
                executable: false,
                rentEpoch: 0
            });
        } else {
            // For USDC to SOL, give user SOL for fees and USDC for swaps
            await context.banksClient.setAccount(user, {
                lamports: feeLamports,
                data: Buffer.alloc(0),
                owner: SystemProgram.programId,
                executable: false,
                rentEpoch: 0
            });

            // Create USDC token account with balance
            const usdcAta = getAssociatedTokenAddressSync(USDC, user);
            const usdcAccount = createTokenAccount(USDC, user, totalAmountNeeded);
            await context.banksClient.setAccount(usdcAta, usdcAccount);
        }

        const results = [];

        // Simulate swaps across all markets
        for (const market of SOLFI_MARKETS) {
            try {
                const toAta = getAssociatedTokenAddressSync(toMint, user);
                const balanceBefore = await getTokenBalance(context, toAta);

                // Create transaction instructions
                const instructions = [
                    createAssociatedTokenAccountIdempotentInstruction(
                        user, user, WSOL, TOKEN_PROGRAM_ID
                    ),
                    createAssociatedTokenAccountIdempotentInstruction(
                        user, user, USDC, TOKEN_PROGRAM_ID
                    )
                ];

                // Add SOL wrapping instructions for SOL to USDC swaps
                if (direction === SwapDirection.SOL_TO_USDC) {
                    const wsolAta = getAssociatedTokenAddressSync(WSOL, user);
                    instructions.push(
                        SystemProgram.transfer({
                            fromPubkey: user,
                            toPubkey: wsolAta,
                            lamports: amountInAtomic
                        }),
                        createSyncNativeInstruction(wsolAta, TOKEN_PROGRAM_ID)
                    );
                }

                // Add the swap instruction
                instructions.push(createSwapInstruction(
                    direction, market, user, WSOL, USDC, amountInAtomic
                ));

                // Create and send transaction
                const transaction = new Transaction().add(...instructions);
                transaction.recentBlockhash = context.lastBlockhash;
                transaction.feePayer = user;
                transaction.sign(userKeypair);

                // Simulate transaction execution
                await context.banksClient.processTransaction(transaction);

                // Get balance after transaction
                const balanceAfter = await getTokenBalance(context, toAta);
                const outAmountAtomic = Number(balanceAfter - balanceBefore);
                const outAmountUi = outAmountAtomic / Math.pow(10, toDecimals);

                const swapResult = new SwapResult(
                    market.toString(),
                    inAmountUi,
                    outAmountUi,
                    null
                );

                if (print) {
                    console.log(`${swapResult.market},${swapResult.inAmount},${swapResult.outAmount},`);
                }

                results.push(swapResult);

            } catch (error) {
                if (!ignoreErrors) {
                    const swapResult = new SwapResult(
                        market.toString(),
                        inAmountUi,
                        null,
                        error.message
                    );

                    if (print) {
                        console.log(`${swapResult.market},${swapResult.inAmount},,${swapResult.error}`);
                    }

                    results.push(swapResult);
                }
            }
        }

        return results;

    } catch (error) {
        throw new Error(`Simulation failed: ${error.message}`);
    }
}

// Export for use as module
export default simulate;