import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./index.css";

import AMMFactoryABI from "./abi/AMMFactory.json";
import AMMPairABI from "./abi/AMMPair.json";
import AMMRouterABI from "./abi/AMMRouter.json";

// Endereços dos contratos na Polygon
const AMMFactoryAddress = "0xE56eD3210d527584bAEBE8151BdD84C323819f27";
const AMMRouterAddress = "0x25aBb3Cb02A00fd30007b0F2c8C484a159624545";

// Tokens especiais da exchange
const EXCEPTIONS = [
  {
    name: "Megalodonte Game Coin",
    symbol: "MGC",
    address: "0xB937EF0351c365d7de17161A8bAe385bE4c86E37",
    pairs: ["MGC/DAI", "MGC/MATIC"],
  },
  {
    name: "House of Crypto Exchange Token",
    symbol: "HOCE",
    address: "0x1E990bCa17ECA84a8f21FB2E6713c692029Ac9eA",
    pairs: ["HOCE/USDT"],
  },
];

const STORAGE_KEY = "hoe_pools_v2";
const MIN_VISIBLE_USD = 200;
const GRACE_PERIOD_MS = 48 * 60 * 60 * 1000; // 48h

function loadPools() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to parse pools from storage", e);
  }

  const seed = EXCEPTIONS.map((t) => ({
    ...t,
    liquidityUSD: Infinity,
    createdAt: Date.now(),
    visible: true,
  }));

  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function savePools(pools) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pools));
}

function isException(addressOrSymbol) {
  const low = (addressOrSymbol || "").toLowerCase();
  return EXCEPTIONS.some(
    (t) =>
      t.address.toLowerCase() === low ||
      t.symbol.toLowerCase() === low ||
      t.name.toLowerCase() === low
  );
}

export default function App() {
  const [page, setPage] = useState(1);
  const [darkMode, setDarkMode] = useState(false);
  const [account, setAccount] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [pools, setPools] = useState(() => loadPools());
  const [networkOk, setNetworkOk] = useState(true);

  const [provider, setProvider] = useState(null);
  const [factoryContract, setFactoryContract] = useState(null);
  const [routerContract, setRouterContract] = useState(null);

  // Inicializa a conexão com blockchain
  useEffect(() => {
    if (window.ethereum) {
      const prov = new ethers.BrowserProvider(window.ethereum);
      setProvider(prov);
      const factory = new ethers.Contract(
        AMMFactoryAddress,
        AMMFactoryABI,
        prov
      );
      const router = new ethers.Contract(
        AMMRouterAddress,
        AMMRouterABI,
        prov
      );
      setFactoryContract(factory);
      setRouterContract(router);
    }
  }, []);

  useEffect(() => {
    const now = Date.now();
    const updated = pools.map((p) => {
      const addrOrSym = p.address || p.symbol || p.name;
      if (isException(addrOrSym)) return { ...p, visible: true };
      if (p.liquidityUSD >= MIN_VISIBLE_USD) return { ...p, visible: true };
      if (now - p.createdAt <= GRACE_PERIOD_MS) return { ...p, visible: true };
      return { ...p, visible: false };
    });
    setPools(updated);
    savePools(updated);
  }, []);

  const refreshVisibility = (newPools) => {
    const now = Date.now();
    const updated = newPools.map((p) => {
      const addrOrSym = p.address || p.symbol || p.name;
      if (isException(addrOrSym)) return { ...p, visible: true };
      if (p.liquidityUSD >= MIN_VISIBLE_USD) return { ...p, visible: true };
      if (now - p.createdAt <= GRACE_PERIOD_MS) return { ...p, visible: true };
      return { ...p, visible: false };
    });
    setPools(updated);
    savePools(updated);
  };

  // Conecta MetaMask
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Install MetaMask first!");
      return;
    }
    try {
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);

      const chainIdHex = await provider.send("eth_chainId", []);
      const chainIdNum = parseInt(chainIdHex, 16);
      if (chainIdNum !== 137) {
        setNetworkOk(false);
        alert("Switch to Polygon Mainnet.");
      } else setNetworkOk(true);
    } catch (err) {
      console.error("Wallet error:", err);
      alert("Failed to connect wallet.");
    }
  };

  const filteredPools = pools.filter((p) => {
    if (!searchInput) return true;
    const q = searchInput.toLowerCase().trim();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.symbol && p.symbol.toLowerCase().includes(q)) ||
      (p.pairs && p.pairs.some((pair) => pair.toLowerCase().includes(q))) ||
      (p.address && p.address.toLowerCase().includes(q))
    );
  });

  const createPool = async ({ name, symbol, address, pair, initialLiquidityUSD }) => {
    if (!name || !symbol || !address || !pair) return alert("Fill all info.");

    if (pools.some((p) => p.address.toLowerCase() === address.toLowerCase()))
      return alert("Pool already exists.");

    const createdAt = Date.now();
    const pool = {
      name,
      symbol,
      address,
      pairs: [pair],
      liquidityUSD: initialLiquidityUSD,
      createdAt,
      visible: true,
    };

    const newPools = [pool, ...pools];
    setPools(newPools);
    savePools(newPools);

    if (initialLiquidityUSD < MIN_VISIBLE_USD && !isException(symbol)) {
      alert(
        `Pool created but needs $${MIN_VISIBLE_USD} for permanent visibility.`
      );
    } else {
      alert("Pool created and visible.");
    }

    // Aqui você pode adicionar a lógica de criar a pool direto na blockchain
    // usando routerContract e factoryContract, se quiser.
  };

  const addLiquidity = async (address, amountUSD) => {
    if (!address || !amountUSD || amountUSD <= 0) return alert("Invalid pool/amount.");

    const idx = pools.findIndex((p) => p.address.toLowerCase() === address.toLowerCase());
    if (idx === -1) return alert("Pool not found.");

    const clone = [...pools];
    clone[idx].liquidityUSD = (clone[idx].liquidityUSD || 0) + amountUSD;
    refreshVisibility(clone);

    alert(`Added $${amountUSD} liquidity to ${clone[idx].pairs.join(", ")}. Current: $${clone[idx].liquidityUSD}`);
  };

  const handleDeposit = () => {
    if (!account) return alert("Connect wallet first.");
    const addr = prompt("Token address (0x...):");
    if (!addr) return;
    const amount = parseFloat(prompt("Amount in USD:"));
    if (isNaN(amount) || amount <= 0) return alert("Invalid amount.");
    addLiquidity(addr, amount);
  };

  const handleWithdraw = () => {
    if (!account) return alert("Connect wallet first.");
    const addr = prompt("Token address (0x...):");
    if (!addr) return;
    const amount = parseFloat(prompt("Withdraw amount in USD:"));
    if (isNaN(amount) || amount <= 0) return alert("Invalid amount.");

    const idx = pools.findIndex((p) => p.address.toLowerCase() === addr.toLowerCase());
    if (idx === -1) return alert("Pool not found.");

    const clone = [...pools];
    const available = clone[idx].liquidityUSD || 0;
    if (amount > available) return alert("Insufficient liquidity.");
    clone[idx].liquidityUSD = Math.max(0, available - amount);
    refreshVisibility(clone);
    alert(`Withdrew $${amount} from ${clone[idx].pairs.join(", ")}. Current: $${clone[idx].liquidityUSD}`);
  };

  const poolVisibilityText = (p) => {
    if (isException(p.address) || isException(p.symbol)) return "Visible (exception)";
    if (p.liquidityUSD >= MIN_VISIBLE_USD) return `Visible (liquidity $${p.liquidityUSD})`;
    const now = Date.now();
    if (now - p.createdAt <= GRACE_PERIOD_MS) {
      const remaining = Math.max(0, GRACE_PERIOD_MS - (now - p.createdAt));
      const hours = Math.ceil(remaining / (60 * 60 * 1000));
      return `Temporary visible (${hours}h left)`;
    }
    return `Hidden (needs $${MIN_VISIBLE_USD} liquidity)`;
  };

  return (
    <div className={`app-container ${darkMode ? "dark" : "light"}`}>
      <header>
        <button onClick={() => setPage(1)}>Página 1 (Beginner)</button>
        <button onClick={() => setPage(2)}>Página 2 (Pro)</button>
      </header>

      {page === 1 && (
        <div className="page-iniciante">
          <h1>Welcome to House of Crypto Exchanges</h1>
          <p>Trade tokens easily and quickly.</p>

          <div className="search-bar">
            <input
              type="text"
              placeholder="🔍 Search token by name, symbol or contract"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button
              onClick={() => {
                if (!searchInput) return alert("Type something first.");
                const matches = pools.filter((p) =>
                  p.name?.toLowerCase().includes(searchInput.toLowerCase())
                );
                alert(`${matches.length} token(s) found.`);
                setPage(2);
              }}
            >
              Search
            </button>
          </div>

          <div className="actions">
            <button
              onClick={() => {
                const name = prompt("Token name:");
                if (!name) return;
                const symbol = prompt("Token symbol:");
                if (!symbol) return;
                const address = prompt("Token address (0x...):");
                if (!address) return;
                const pair = prompt("Pair (ex: MTK/DAI):", `${symbol}/DAI`);
                if (!pair) return;
                const liq = parseFloat(prompt(`Initial liquidity in USD:`));
                createPool({
                  name,
                  symbol,
                  address,
                  pair,
                  initialLiquidityUSD: isNaN(liq) ? 0 : liq,
                });
              }}
            >
              ➕ Create Pool
            </button>
            <button
              onClick={() => {
                const address = prompt("Token address to add liquidity (0x...):");
                if (!address) return;
                const amount = parseFloat(prompt("Amount in USD:"));
                if (isNaN(amount) || amount <= 0) return alert("Invalid amount.");
                addLiquidity(address, amount);
              }}
            >
              🔗 Add Liquidity
            </button>
            <button onClick={handleDeposit}>💰 Deposit</button>
            <button onClick={handleWithdraw}>💵 Withdraw</button>
          </div>

          <button className="connect-wallet" onClick={connectWallet}>
            {account
              ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`
              : "🔗 Connect Wallet"}
          </button>
        </div>
      )}

      {page === 2 && (
        <div className={`page-profissional ${darkMode ? "dark" : "light"}`}>
          <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "🌞 Light Mode" : "🌙 Dark Mode"}
          </button>

          <h2>Trading Dashboard</h2>

          <iframe
            src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview&symbol=BINANCE:BTCUSDT&interval=60&theme=dark"
            width="100%"
            height="400"
            frameBorder="0"
            allowTransparency="true"
            scrolling="no"
            title="TradingView Chart"
          ></iframe>

          <ul>
            {filteredPools.map((p) => (
              <li key={p.address}>
                <strong>{p.pairs.join(", ")}</strong> — {poolVisibilityText(p)}
              </li>
            ))}
          </ul>

          <div className="actions">
            <button
              onClick={() => {
                const name = prompt("Token name:");
                if (!name) return;
                const symbol = prompt("Token symbol:");
                if (!symbol) return;
                const address = prompt("Token address (0x...):");
                if (!address) return;
                const pair = prompt("Pair (ex: MTK/DAI):", `${symbol}/DAI`);
                if (!pair) return;
                const liq = parseFloat(prompt(`Initial liquidity in USD:`));
                createPool({
                  name,
                  symbol,
                  address,
                  pair,
                  initialLiquidityUSD: isNaN(liq) ? 0 : liq,
                });
              }}
            >
              ➕ Create Pool
            </button>
            <button
              onClick={() => {
                const address = prompt("Token address to add liquidity (0x...):");
                if (!address) return;
                const amount = parseFloat(prompt("Amount in USD:"));
                if (isNaN(amount) || amount <= 0) return alert("Invalid amount.");
                addLiquidity(address, amount);
              }}
            >
              🔗 Add Liquidity
            </button>
            <button onClick={handleDeposit}>💰 Deposit</button>
            <button onClick={handleWithdraw}>💵 Withdraw</button>
          </div>
        </div>
      )}
    </div>
  );
}
