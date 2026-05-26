// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  // Endereços dos tokens (construtor)
  const REFERENCE_STABLE = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
  const FOUNDER_TOKEN = "0x1E990bCa17ECA84a8f21FB2E6713c692029Ac9eA";
  const MEGALODON_TOKEN = "0xB937EF0351c365d7de17161A8bAe385bE4c86E37";

  console.log("Compiling contracts...");
  await hre.run('compile');

  // Aqui usamos o nome totalmente qualificado pra evitar HH701
  const Factory = await hre.ethers.getContractFactory("contracts/AMMFactory.sol:AMMFactory");

  console.log("Deploying AMMFactory with constructor arguments...");
  const factory = await Factory.deploy(REFERENCE_STABLE, FOUNDER_TOKEN, MEGALODON_TOKEN);

  await factory.deployed();

  console.log("✅ AMMFactory deployed to:", factory.address);
  console.log("Constructor args used:");
  console.log("REFERENCE_STABLE:", REFERENCE_STABLE);
  console.log("FOUNDER_TOKEN:", FOUNDER_TOKEN);
  console.log("MEGALODON_TOKEN:", MEGALODON_TOKEN);
}

// Se houver erro, ele sai do processo com código 1
main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
