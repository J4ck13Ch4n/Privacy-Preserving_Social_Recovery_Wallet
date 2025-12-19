import { ethers } from "hardhat";

async function main() {
    console.log("Starting deployment...");

    // 1. Deploy Verifier
    const Verifier = await ethers.getContractFactory("contracts/GuardianVerifier.sol:Groth16Verifier");
    const guardianVerifier = await Verifier.deploy();
    await guardianVerifier.waitForDeployment();
    const verifierAddress = await guardianVerifier.getAddress();
    console.log(`GuardianVerifier deployed to: ${verifierAddress}`);

    // 2. Deploy SocialRecoveryVault
    const Vault = await ethers.getContractFactory("contracts/SocialRecoveryVault.sol:SocialRecoveryVault");
    const socialRecoveryVault = await Vault.deploy(verifierAddress);
    await socialRecoveryVault.waitForDeployment();
    const vaultAddress = await socialRecoveryVault.getAddress();
    console.log(`SocialRecoveryVault deployed to: ${vaultAddress}`);

    console.log("Deployment complete!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
