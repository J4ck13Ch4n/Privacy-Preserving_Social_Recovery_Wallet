# ZKSRP: Unlinkable Zero-Knowledge Social Recovery Protocol for Smart Contract Wallets

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This repository contains the core circuit and smart contract implementation for **ZKSRP (Zero-Knowledge Social Recovery Protocol)**, a privacy-preserving recovery mechanism for smart contract wallets.

## Key Features

*   **Unlinkability**: Breaks the on-chain link between Holder and Guardians using Zero-Knowledge Proofs (Groth16).
*   **Constant Gas Cost**: Verification costs ~$O(1)$ (~312k gas) regardless of the anonymity set size.
*   **Anti-Replay**: Uses session-scoped **Nullifiers** to prevent double-voting while allowing multi-session participation.
*   **Wallet Binding**: Commitments are cryptographically bound to the specific wallet policy, preventing cross-wallet replay attacks.

## Architecture

The system consists of two main components:
1.  **Circuits (`/circuits`)**: Circom-based ZK-SNARK circuits defining the logic for membership proofs and nullifier generation.
2.  **Contracts (`/contracts`)**: Solidity smart contracts for verifying proofs, managing the Merkle tree root history, and executing recovery logic.

## Getting Started

### Prerequisites

Ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v16 or higher)
*   [Circom](https://docs.circom.io/getting-started/installation/) (v2.0.0+)
*   [SnarkJS](https://github.com/iden3/snarkjs) (Global install recommended: `npm install -g snarkjs`)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/J4ck13Ch4n/Privacy-Preserving_Social_Recovery_Wallet.git
    cd Privacy-Preserving_Social_Recovery_Wallet
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Usage

### 1. Compile Circuits
Compiles the `GuardianApproval.circom` circuit to generating the R1CS and WASM needed for witness generation.
```bash
npm run circuit:compile
```
*Output directory: `build/circuits/`*

### 2. Compile Contracts
Compiles the Solidity contracts, including the Verifier (generated from ZK keys) and the Recovery Vault.
```bash
npx hardhat compile
```

### 3. Run Tests
Executes the full end-to-end test suite (Contract deployment -> Logic verification).
```bash
npx hardhat test
```

## Project Structure

```
├── circuits/               # Circom ZK circuits
│   └── guardian_approval.circom
├── contracts/              # Solidity smart contracts
├── scripts/                # Deployment and utility scripts
├── test/                   # Hardhat tests (TypeScript)
├── hardhat.config.ts       # Hardhat configuration
└── package.json            # Dependencies and scripts
```

## Security Disclaimer
This code is a research prototype and **has not been audited**. It is intended for educational and demonstration purposes only. Use in production environments is at your own risk.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
