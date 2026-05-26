/**
* Deploy script usando Hardhat + ethers
* - Lê .env para RPC + DEPLOYER_PRIVATE_KEY
* - Parâmetros DEFAULT (substitua no .env se quiser):
* REFERENCE_STABLE = 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063 // DAI Polygon
* FOUNDER_TOKEN = 0xB937EF0351c365d7de17161A8bAe385bE4c86E37 // seu token
*/


const { ethers } = require('hardhat');
require('dotenv').config();


async function main() {
const [deployer] = await ethers.getSigners();
console.log('Deploying with', deployer.address);


const REFERENCE_STABLE = process.env.REFERENCE_STABLE;
const FOUNDER_TOKEN = process.env.FOUNDER_TOKEN;


if (!REFERENCE_STABLE || !FOUNDER_TOKEN) {
throw new Error('.env must define REFERENCE_STABLE and FOUNDER_TOKEN');
}


const Factory = await ethers.getContractFactory('AMMFactory');
const factory = await Factory.deploy(REFERENCE_STABLE, FOUNDER_TOKEN);
await factory.deployed();
console.log('Factory deployed at', factory.address);


const Router = await ethers.getContractFactory('AMMRouter');
const router = await Router.deploy(factory.address);
await router.deployed();
console.log('Router deployed at', router.address);


console.log('\n--- DEPLOY COMPLETE ---');
console.log('Factory:', factory.address);
console.log('Router :', router.address);
}


main().catch((error) => {
console.error(error);
process.exitCode = 1;
});