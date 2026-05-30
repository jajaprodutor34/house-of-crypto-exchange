import React from "react";

export default function SwapBox({
  account,
  swapFrom,
  swapTo,
  swapAmount,
  setSwapFrom,
  setSwapTo,
  setSwapAmount,
}) {

  const handleSwap = async () => {

    if (!account) {
      return alert("Connect wallet first.");
    }

    if (
      !swapAmount ||
      Number(swapAmount) <= 0
    ) {
      return alert("Invalid amount.");
    }

    alert(
      `Swap simulated:\n${swapAmount} ${swapFrom} → ${swapTo}`
    );
  };

  return (
    <div className="swap-box">

      <h2>🔄 Instant Swap</h2>

      <input
        type="text"
        placeholder="Token From"
        value={swapFrom}
        onChange={(e) =>
          setSwapFrom(e.target.value)
        }
      />

      <input
        type="text"
        placeholder="Token To"
        value={swapTo}
        onChange={(e) =>
          setSwapTo(e.target.value)
        }
      />

      <input
        type="number"
        placeholder="Amount"
        value={swapAmount}
        onChange={(e) =>
          setSwapAmount(e.target.value)
        }
      />

      <button onClick={handleSwap}>
        🔥 Swap Tokens
      </button>

    </div>
  );
}