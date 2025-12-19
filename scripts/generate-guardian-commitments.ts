#!/usr/bin/env tsx
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { computeGuardianLeaf } from '../src/web/smt.ts'
import { bigintToHex, normalizeToField } from '../src/web/poseidon.ts'

interface GuardianInput {
  address: string
  sharedSecret: string
}

interface CliOptions {
  input: string
  output: string
  fullOutput?: string
  pretty: boolean
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2)
  const opts: CliOptions = {
    input: '/NT547/ZKSRP/blockchain/testcase/guardians.json',
    output: '/NT547/ZKSRP/blockchain/testcase/commitments.json',
    pretty: true,
  }
  while (args.length) {
    const flag = args.shift()
    if (!flag) break
    switch (flag) {
      case '--input':
      case '-i':
        opts.input = expectValue(flag, args)
        break
      case '--output':
      case '-o':
        opts.output = expectValue(flag, args)
        break
      case '--full':
        opts.fullOutput = expectValue(flag, args)
        break
      case '--compact':
        opts.pretty = false
        break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
      default:
        throw new Error(`Unsupported flag ${flag}`)
    }
  }
  return opts
}

function expectValue(flag: string, args: string[]): string {
  const value = args.shift()
  if (!value) throw new Error(`Missing value for ${flag}`)
  return value
}

function printHelp() {
  console.log(`Usage:
  npx tsx scripts/generate-guardian-commitments.ts --input guardians.json --output commitments.json [--full guardians_with_commitments.json]

Input format (guardians.json):
[
  { "address": "0xf39f...", "sharedSecret": "0x1234" },
  { "address": "0x7099...", "sharedSecret": "123456789" }
]
`)
}

function ensureHexAddress(value: string): string {
  if (!value) throw new Error('Guardian address is required')
  const trimmed = value.trim().toLowerCase()
  if (!/^0x[0-9a-f]{40}$/.test(trimmed)) {
    throw new Error(`Invalid guardian address ${value}`)
  }
  return trimmed
}

function normalizeSecret(value: string): string {
  if (!value) throw new Error('Shared secret is required')
  const trimmed = value.trim()
  if (!trimmed) throw new Error('Shared secret is required')
  if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
    return `0x${trimmed.slice(2).toLowerCase()}`
  }
  const bigint = normalizeToField(BigInt(trimmed))
  return bigintToHex(bigint)
}

async function main() {
  const opts = parseArgs(process.argv)
  const raw = await readFile(resolve(process.cwd(), opts.input), 'utf8')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    throw new Error('Input file must be valid JSON')
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Input file must be an array of {address, sharedSecret}')
  }
  const guardians: GuardianInput[] = parsed.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Guardian entry at index ${index} is invalid`)
    }
    const { address, sharedSecret } = item as Record<string, string>
    return {
      address: ensureHexAddress(address),
      sharedSecret: normalizeSecret(sharedSecret),
    }
  })

  const commitments: Array<{ key: string; leaf: string; hashedSecret: string }> = []
  const full: Array<GuardianInput & { key: string; leaf: string; hashedSecret: string }> = []

  for (const guardian of guardians) {
    const { key, leaf, hashedSecret } = await computeGuardianLeaf(guardian.address, guardian.sharedSecret)
    commitments.push({ key, leaf, hashedSecret })
    full.push({ ...guardian, key, leaf, hashedSecret })
  }

  const json = opts.pretty ? JSON.stringify(commitments, null, 2) : JSON.stringify(commitments)
  await writeFile(resolve(process.cwd(), opts.output), json)
  console.log(`Wrote commitments to ${opts.output}`)

  if (opts.fullOutput) {
    const fullJson = opts.pretty ? JSON.stringify(full, null, 2) : JSON.stringify(full)
    await writeFile(resolve(process.cwd(), opts.fullOutput), fullJson)
    console.log(`Wrote detailed guardian data to ${opts.fullOutput}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
