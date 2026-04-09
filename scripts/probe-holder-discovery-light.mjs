import { ApiPromise, WsProvider } from "@polkadot/api";

const provider = new WsProvider(["wss://entrypoint-finney.opentensor.ai:443"], 2500);
const api = await ApiPromise.create({ provider, noInitWarn: true });

function simplify(value) {
  try {
    if (value?.toHuman) return value.toHuman();
    if (value?.toJSON) return value.toJSON();
  } catch {}
  return String(value);
}

try {
  for (let i = 0; i < 5; i++) {
    const coldkey = await api.query.subtensorModule.stakingColdkeysByIndex(i);
    console.log(`coldkey[${i}]`, simplify(coldkey));
    try {
      const hotkeys = await api.query.subtensorModule.stakingHotkeys(String(coldkey));
      console.log(`hotkeys[${i}]`, JSON.stringify(simplify(hotkeys), null, 2));
    } catch (e) {
      console.log(`hotkeys[${i}] error`, String(e));
    }
  }
} finally {
  await api.disconnect().catch(() => {});
}
