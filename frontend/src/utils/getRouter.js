import { ethers } from "ethers";
import { connectWallet } from "./connectWallet";
import routerABI from "../abi/AMMRouter.json"; // o arquivo da ABI do seu Router

const routerAddress = "0xSEU_ENDERECO_DO_ROUTER"; // substitua pelo real

export async function getRouter() {
  const { signer } = await connectWallet();
  const router = new ethers.Contract(routerAddress, routerABI, signer);
  console.log("✅ Router conectado:", router);
  return router;
}
