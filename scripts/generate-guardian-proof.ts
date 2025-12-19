#!/usr/bin/env tsx
/**
 * Generate witness + proof for guardian_approval and ABI-encode payloads for GuardianVerifierAdapter.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { AbiCoder } from 'ethers'

interface CliOptions {
  input: string
  wasm: string
  zkey: string
  output?: string
  pretty: boolean
  proofFile?: string
  publicFile?: string
}

function parseArgs(argv: string[]): CliOptions {
  const args = [...argv]
  args.shift()
  args.shift()
  const opts: CliOptions = {
    input: 'circuits/input_sample.json',
    wasm: 'circuits/guardian_approval_js/guardian_approval.wasm',
    zkey: 'artifacts/guardian/guardian_approval_final.zkey',
    output: undefined,
    pretty: false,
    proofFile: undefined,
    publicFile: undefined,
  }
  while (args.length) {
    const key = args.shift()
    if (!key) break
    switch (key) {
      case '--input':
      case '-i':
        opts.input = expectValue(key, args)
        break
      case '--wasm':
        opts.wasm = expectValue(key, args)
        break
      case '--zkey':
        opts.zkey = expectValue(key, args)
        break
      case '--output':
      case '-o':
        opts.output = expectValue(key, args)
        break
      case '--pretty':
        opts.pretty = true
        break
      case '--snarkjs-proof':
        opts.proofFile = expectValue(key, args)
        break
      case '--snarkjs-public':
        opts.publicFile = expectValue(key, args)
        break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
      default:
        throw new Error(`Unsupported flag: ${key}`)
    }
  }
  return opts
}

function expectValue(flag: string, args: string[]): string {
  const next = args.shift()
  if (!next) throw new Error(`Missing value for ${flag}`)
  return next
}

function printHelp() {
  console.log(`Usage:
  npx tsx scripts/generate-guardian-proof.ts --input input.json [--wasm path] [--zkey path] [--output out.json] [--pretty] [--snarkjs-proof proof.json] [--snarkjs-public public.json]
`)
}

function toHex(value: bigint, bytes: number): string {
  const hex = value.toString(16)
  return `0x${hex.padStart(bytes * 2, '0')}`
}

function parseCallData(raw: string) {
  const cleaned = raw.replace(/\[|\]|\s|"/g, '')
  const parts = cleaned.split(',').filter(Boolean)
  if (parts.length < 13) {
    throw new Error('Invalid call data format')
  }
  const numbers = parts.map((p) => BigInt(p))
  const a: [bigint, bigint] = [numbers[0], numbers[1]]
  const b: [[bigint, bigint], [bigint, bigint]] = [
    [numbers[2], numbers[3]],
    [numbers[4], numbers[5]],
  ]
  const c: [bigint, bigint] = [numbers[6], numbers[7]]
  const inputs = numbers.slice(8)
  return { a, b, c, inputs }
}

function mapPublicSignals(signals: string[]) {
  if (signals.length < 5) {
    throw new Error('Public signals are incomplete')
  }
  const policyId = BigInt(signals[0])
  const recoveryRequestId = BigInt(signals[1])
  const merkleRoot = BigInt(signals[2])
  const nullifier = BigInt(signals[3])
  const newOwner = BigInt(signals[4])
  if (newOwner >= (1n << 160n)) {
    throw new Error('newOwner exceeds 160 bits')
  }
  return {
    policyId: toHex(policyId, 32),
    recoveryRequestId: toHex(recoveryRequestId, 32),
    merkleRoot: toHex(merkleRoot, 32),
    nullifier: toHex(nullifier, 32),
    newOwner: toHex(newOwner, 20),
  }
}

async function main() {
  const opts = parseArgs(process.argv)
  const [snarkjsModule, inputRaw] = await Promise.all([
    import('snarkjs'),
    readFile(resolve(process.cwd(), opts.input), 'utf8'),
  ])
  const snarkjs: any = snarkjsModule
  const input = JSON.parse(inputRaw)
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    resolve(process.cwd(), opts.wasm),
    resolve(process.cwd(), opts.zkey),
  )
  const callData = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals)
  const parsed = parseCallData(callData)
  const encoder = AbiCoder.defaultAbiCoder()
  const encodedProof = encoder.encode(
    ['uint256[2]', 'uint256[2][2]', 'uint256[2]'],
    [parsed.a, parsed.b, parsed.c],
  )
  const publicStruct = mapPublicSignals(publicSignals)
  const encodedPublicSignals = encoder.encode([
    'tuple(bytes32 policyId, bytes32 recoveryRequestId, bytes32 merkleRoot, bytes32 nullifier, address newOwner)',
  ], [publicStruct])
  const result = {
    proof: parsed,
    publicSignals: publicStruct,
    encodedProof,
    encodedPublicSignals,
    snarkjsProof: proof,
    snarkjsPublicSignals: publicSignals,
  }
  const replacer = (key: string, value: any) => {
    if (typeof value === 'bigint') {
      return value.toString()
    }
    return value
  }
  const writes: Promise<void>[] = []
  if (opts.output) {
    const json = opts.pretty ? JSON.stringify(result, replacer, 2) : JSON.stringify(result, replacer)
    writes.push(writeFile(resolve(process.cwd(), opts.output), json)
      .then(() => {
        console.log(`Wrote ${opts.output}`)
      }))
  } else {
    console.log(JSON.stringify(result, replacer, 2))
  }
  if (opts.proofFile) {
    const proofJson = opts.pretty ? JSON.stringify(proof, null, 2) : JSON.stringify(proof)
    writes.push(writeFile(resolve(process.cwd(), opts.proofFile), proofJson)
      .then(() => {
        console.log(`Wrote ${opts.proofFile}`)
      }))
  }
  if (opts.publicFile) {
    const publicJson = opts.pretty ? JSON.stringify(publicSignals, null, 2) : JSON.stringify(publicSignals)
    writes.push(writeFile(resolve(process.cwd(), opts.publicFile), publicJson)
      .then(() => {
        console.log(`Wrote ${opts.publicFile}`)
      }))
  }
  await Promise.all(writes)
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
