export const PUMP_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const TOKEN_PROGRAMS = ['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'];
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
// Discriminators/account positions from pump-fun/pump-public-docs/idl/pump.json (create and create_v2).
const CREATE = [
  { discriminator: Buffer.from([24, 30, 200, 40, 5, 28, 7, 119]), userIndex: 7 },
  { discriminator: Buffer.from([214, 144, 76, 236, 95, 139, 49, 180]), userIndex: 5 },
];

export function decodeBase58(input) {
  if (typeof input !== 'string' || input.length > 5000 || !/^[1-9A-HJ-NP-Za-km-z]+$/.test(input)) throw new Error('Invalid base58 data.');
  let number = 0n;
  for (const char of input) number = number * 58n + BigInt(ALPHABET.indexOf(char));
  const bytes = [];
  while (number) { bytes.push(Number(number & 255n)); number >>= 8n; }
  const zeros = input.match(/^1*/)[0].length;
  return Buffer.concat([Buffer.alloc(zeros), Buffer.from(bytes.reverse())]);
}

function instructionArgs(data) {
  let offset = 8;
  const args = [];
  for (let index = 0; index < 3; index++) {
    if (offset + 4 > data.length) throw new Error('Invalid pump.fun instruction data.');
    const length = data.readUInt32LE(offset); offset += 4;
    if (length > 2000 || offset + length > data.length) throw new Error('Invalid pump.fun instruction data.');
    args.push(data.subarray(offset, offset + length).toString('utf8')); offset += length;
  }
  if (offset + 32 > data.length) throw new Error('Missing pump.fun creator field.');
  return { name: args[0], ticker: args[1], metadataUri: args[2], creator: data.subarray(offset, offset + 32) };
}

export function verifyDeployment(account, transaction, proposal, now = Date.now()) {
  const prepared = Date.parse(proposal.preparedAt);
  if (!Number.isFinite(prepared) || prepared < now - 86_400_000 || prepared > now + 300_000) throw new Error('Prepare a current launch proposal before verifying deployment.');
  const parsed = account?.data?.parsed;
  if (!TOKEN_PROGRAMS.includes(account?.owner) || account.executable || parsed?.type !== 'mint' || parsed.info?.isInitialized !== true) throw new Error('The address is not an initialized Solana token mint.');
  if (!transaction || transaction.meta?.err !== null || !Number.isFinite(transaction.blockTime)) throw new Error('The launch transaction is not yet successfully confirmed.');
  const confirmed = transaction.blockTime * 1000;
  if (confirmed < prepared - 120_000 || confirmed < now - 86_400_000 || confirmed > now + 300_000) throw new Error('The transaction predates this launch preparation or is too old.');
  const keys = transaction.transaction?.message?.accountKeys || [];
  if (!keys.some((key) => key.pubkey === proposal.creatorWallet && key.signer)) throw new Error('The connected wallet did not sign this transaction.');
  if (transaction.transaction?.signatures?.[0] !== proposal.signature) throw new Error('The transaction signature does not match.');
  const instructions = [...(transaction.transaction?.message?.instructions || []), ...(transaction.meta.innerInstructions || []).flatMap((group) => group.instructions || [])];
  const initialized = instructions.some((instruction) => TOKEN_PROGRAMS.includes(instruction.programId) &&
    ['initializeMint', 'initializeMint2'].includes(instruction.parsed?.type) && instruction.parsed.info?.mint === proposal.mintAddress);
  if (!initialized) throw new Error('This transaction did not initialize the submitted mint.');
  let creation = null;
  for (const instruction of instructions) {
    if (instruction.programId !== PUMP_PROGRAM || typeof instruction.data !== 'string') continue;
    const data = decodeBase58(instruction.data);
    const variant = CREATE.find((entry) => data.subarray(0, 8).equals(entry.discriminator));
    if (!variant || instruction.accounts?.[0] !== proposal.mintAddress || instruction.accounts?.[variant.userIndex] !== proposal.creatorWallet) continue;
    const args = instructionArgs(data);
    if (!args.creator.equals(decodeBase58(proposal.creatorWallet))) continue;
    if (args.name !== proposal.name || args.ticker !== proposal.ticker) throw new Error('The deployed token name or ticker differs from the prepared proposal.');
    creation = args; break;
  }
  if (!creation) throw new Error('No pump.fun create instruction for this mint and wallet was found.');
  return { verified: true, mintAddress: proposal.mintAddress, signature: proposal.signature,
    creatorWallet: proposal.creatorWallet, name: creation.name, ticker: creation.ticker,
    metadataUri: creation.metadataUri, network: 'mainnet-beta', confirmedAt: new Date(confirmed).toISOString() };
}

export async function verifyCoin(proposal, { rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', fetcher = fetch } = {}) {
  if (proposal.network && proposal.network !== 'mainnet-beta') throw new Error('Verified TweetMint pump.fun launches require mainnet-beta.');
  for (const field of ['mintAddress', 'creatorWallet']) if (decodeBase58(proposal[field]).length !== 32) throw new Error(`Invalid ${field}.`);
  if (decodeBase58(proposal.signature).length !== 64) throw new Error('Invalid transaction signature.');
  if (typeof proposal.name !== 'string' || !proposal.name.trim() || proposal.name.length > 80 || typeof proposal.ticker !== 'string' || !/^[a-zA-Z0-9]{1,12}$/.test(proposal.ticker)) throw new Error('Invalid token name or ticker.');
  async function rpc(method, params) {
    const response = await fetcher(rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Solana RPC returned HTTP ${response.status}.`);
    const result = await response.json();
    if (result.error) throw new Error('Solana RPC could not verify this transaction. Try again later.');
    return result.result;
  }
  const checks = await Promise.allSettled([
    rpc('getAccountInfo', [proposal.mintAddress, { encoding: 'jsonParsed', commitment: 'confirmed' }]),
    rpc('getTransaction', [proposal.signature, { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }]),
  ]);
  for (const result of checks) if (result.status === 'rejected') throw result.reason;
  return verifyDeployment(checks[0].value?.value, checks[1].value, proposal);
}
