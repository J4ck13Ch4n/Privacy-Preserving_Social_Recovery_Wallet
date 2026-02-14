pragma circom 2.0.0;

// Use circomlib's Poseidon for hashing
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/switcher.circom";

template MerkleTreeInclusionProof(nLevels) {
    // Private inputs
    signal input leaf;
    signal input leaf_index_bits[nLevels];  // Leaf index bits to determine path direction (0=Left, 1=Right)
    signal input siblings[nLevels];
    
    // Public inputs
    signal input root;
    
    // Declare all hash components upfront
    component hash_components[nLevels];
    component switchers[nLevels];
    
    // First level: hash leaf with first sibling
    switchers[0] = Switcher();
    switchers[0].L <== leaf;
    switchers[0].R <== siblings[0];
    switchers[0].sel <== leaf_index_bits[0];
    
    hash_components[0] = Poseidon(2);
    hash_components[0].inputs[0] <== switchers[0].outL;
    hash_components[0].inputs[1] <== switchers[0].outR;
    
    // Subsequent levels: hash previous result with next sibling
    for (var i = 1; i < nLevels; i++) {
        switchers[i] = Switcher();
        switchers[i].L <== hash_components[i-1].out;
        switchers[i].R <== siblings[i];
        switchers[i].sel <== leaf_index_bits[i];
        
        hash_components[i] = Poseidon(2);
        hash_components[i].inputs[0] <== switchers[i].outL;
        hash_components[i].inputs[1] <== switchers[i].outR;
    }
    
    // Check that final hash matches the root
    root === hash_components[nLevels - 1].out;
}

template GuardianApproval(nLevels) {
    // Private inputs from guardian
    signal input guardian_address; 
    signal input shared_secret;
    // Merkle siblings
    signal input siblings[nLevels];
    // Bits of guardian_address (leaf index) for merkle path
    signal input address_bits[nLevels];
    // Public inputs
    signal input policy_id;
    signal input recovery_request_id;
    signal input merkle_root;
    signal input new_owner;

    // Outputs (public signals order matters)
    signal output out_policy_id;
    signal output out_recovery_request_id;
    signal output out_merkle_root;
    signal output out_nullifier;
    signal output out_new_owner;

    // Compute leaf = Poseidon(guardian_address, policy_id, shared_secret)
    // This binds the commitment to the specific policy (Holder), preventing cross-wallet replay attacks.
    component leaf_hash = Poseidon(3);
    leaf_hash.inputs[0] <== guardian_address;
    leaf_hash.inputs[1] <== policy_id;
    leaf_hash.inputs[2] <== shared_secret;

    // Compute nullifier = Poseidon(shared_secret, recovery_request_id)
    component nullifierHash = Poseidon(2);
    nullifierHash.inputs[0] <== shared_secret;
    nullifierHash.inputs[1] <== recovery_request_id;

    // Verify merkle tree inclusion
    component merkle_check = MerkleTreeInclusionProof(nLevels);
    merkle_check.leaf <== leaf_hash.out;
    merkle_check.root <== merkle_root;
    for (var i = 0; i < nLevels; i++) {
        merkle_check.siblings[i] <== siblings[i];
        merkle_check.leaf_index_bits[i] <== address_bits[i];
    }

    out_policy_id <== policy_id;
    out_recovery_request_id <== recovery_request_id;
    out_merkle_root <== merkle_root;
    out_nullifier <== nullifierHash.out;
    out_new_owner <== new_owner;
}

component main {public [policy_id, recovery_request_id, merkle_root, new_owner]} = GuardianApproval(20);
