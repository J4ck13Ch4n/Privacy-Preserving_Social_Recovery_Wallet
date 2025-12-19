# ZKSRP: Privacy-Preserving Social Recovery Wallet using Zero-Knowledge Proofs

## 1. Abstract
**Problem:** Current social recovery mechanisms solve the issue of lost private keys but create a privacy paradox by exposing the user's trusted network on the public ledger. This "social graph" becomes a static target for social engineering, coercion, and collusion attacks.
**Solution:** ZKSRP (Zero-Knowledge Social Recovery Protocol) is a privacy-preserving social recovery protocol that utilizes Zero-Knowledge Proofs (ZKP). The system decouples the Guardian's identity from the Holder by employing a **Global Anonymity Set** and cryptographic commitments. Guardians can prove their authorization to approve a recovery request without ever determining their identity or whom they are protecting.

## 2. Key Highlights
*   **Unlinkability:** No one (including the Aggregator) can link a Guardian to a specific Holder after the registration phase.
*   **Anti-Social Engineering:** Attackers cannot reconstruct the social graph to target the Holder's trusted contacts.
*   **Multi-Showable Credential:** Guardians can participate in multiple recovery operations without identity leakage, thanks to the intelligent Nullifier mechanism.
*   **Gas Efficient:** Constant verification cost of ~$250k gas (~$0.1 on L2), positioned as a "privacy premium" for asset security.

## 3. Architecture & Components
| Component | Role | Security Note |
|:---|:---|:---|
| **Holder Client** | Initializes wallet, initiates recovery requests | Holds the recovery control key |
| **Guardian Client** | Generates commitments, creates ZK Proofs | Never sends real address on-chain |
| **Aggregator (Sequencer)** | Batches commitments, builds Merkle Tree | **Escape Hatch:** Users can bypass if censorship occurs |
| **Smart Contract** | Verifies proofs, manages nullifiers | Stores only Merkle Root, no Guardian list |
| **ZKP Circuits** | Anonymous verification logic | Enforces strict mathematical binding (Holder-Guardian) |

## 4. Performance & Privacy Comparison
| Criteria | Legacy Multi-Sig | Commit-Reveal | **ZKSRP (Proposed)** |
|:---|:---|:---|:---|
| **Privacy** | Fully Public | Temporary Anonymity (Revealed on recovery) | **Unlinkable** |
| **Complexity** | $O(N)$ (Linear) | $O(N)$ | **$O(1)$ (Constant)** |
| **Gas Cost** | ~120k - 180k gas | ~150k gas + reveal cost | **~250k gas (Fixed)** |
| **Scalability** | Low (Block gas limit) | Low | **High (Merkle Tree)** |
| **Anti-Replay** | Nonce | Hash | **Nullifier** |

## 5. Technical Details

### 5.1. Commitment Formulation (Authorization Gap Fixed)
To prevent replay attacks where a Guardian for Wallet A uses their proof to approve for Wallet B, we bind the commitment to the `policyId` (representing the specific Holder):

$$c = \text{Poseidon}(\text{guardianAddress} \ | \ \text{policyId} \ | \ \text{sharedSecret})$$

*   `guardianAddress`: Guardian's wallet address (hidden).
*   `policyId`: Holder's wallet identifier (public).
*   `sharedSecret`: Secret shared between parties (hidden).

### 5.2. Nullifier Mechanism (Anti-Double-Vote)
A Nullifier is generated to ensure each Guardian can only vote once per specific recovery request, while still remaining eligible for future requests:

$$\text{nullifier} = \text{Poseidon}(\text{sharedSecret} \ | \ \text{recoveryRequestID})$$

*   Unlike Tornado Cash (which spends the note), ZKSRP allows reusing Guardian rights for different `recoveryRequestID`s.

### 5.3. ZKP Circuit Logic
The `GuardianApproval` circuit proves:
1.  **Membership:** "I know a `sharedSecret` that generates a commitment `c` existing in the provided Merkle Tree `root`."
2.  **Authorization:** "Commitment `c` is bound to the `policyId` currently requesting recovery."
3.  **Uniqueness:** "I have not voted for this request yet." (checked via `nullifier`).

## 6. General Pipeline
1.  **Setup:** Holder and Guardian exchange `sharedSecret` via an E2EE channel (Off-chain).
2.  **Registration:** Guardian sends commitment `c` to the Aggregator.
    *   *Escape Hatch:* If Aggregator refuses service, Guardian submits directly to the Contract.
3.  **On-chain:** Aggregator constructs Merkle Tree and updates the Root on the Contract.
4.  **Recovery:** Holder initiates a `recoveryRequestID`.
5.  **Proving:** Guardian generates a ZK Proof (Client-side ~1.5s) and submits it to the Contract.
6.  **Verification:** Contract verifies Proof + Nullifier. If the threshold is met, ownership is transferred.

## 7. Deployment & Testing
### Prerequisites
*   **Node.js v18 or v20 (LTS)** (Required)
*   Circom 2.0+
*   SnarkJS

### Installation
```bash
git clone <repo-url>
cd ZKSRP_core
npm install
```

### Build & Test
1.  **Compile Contracts:**
    ```bash
    npx hardhat compile
    ```
2.  **Run Tests:**
    ```bash
    npx hardhat test
    ```
### Manual Deployment (Localhost)
1.  **Start Local Node:**
    ```bash
    npx hardhat node
    ```
2.  **Deploy Contracts:**
    ```bash
    npx hardhat run scripts/deploy.ts --network localhost
    ```

## 8. Conclusion
ZKSRP is not just a technical solution but a manifesto for privacy in the Web3 era. By transforming "Reputation-based Trust" into "Math-based Trust," we eliminate social risks from the asset recovery process.

