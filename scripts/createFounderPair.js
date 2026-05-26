// Script opcional para criar o par fundador (MGC/DAI) e adicionar liquidez inicial se desejar
const { ethers } = require('hardhat');
require('dotenv').config();


async function main() {
const [deployer] = await ethers.getSigners();
console.log('Using deployer:', deployer.address);


const factoryAddress = process.env.FACTORY_ADDRESS;
const routerAddress = process.env.ROUTER_ADDRESS;
const FOUNDER_TOKEN = process.env.FOUNDER_TOKEN;
const REFERENCE_STABLE = process.env.REFERENCE_STABLE;


if (!factoryAddress || !routerAddress) throw new Error('Set FACTORY_ADDRESS and ROUTER_ADDRESS in .env');


const factory = await ethers.getContractAt('AMMFactory', factoryAddress);
const router = await ethers.getContractAt('AMMRouter', routerAddress);


// Cria pair se não existir
let pair = await factory.getPair(FOUNDER_TOKEN, REFERENCE_STABLE);
if (pair === ethers.constants.AddressZero) {
const tx = await factory.createPair(FOUNDER_TOKEN, REFERENCE_STABLE);
await tx.wait();