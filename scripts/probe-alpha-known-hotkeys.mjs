import { ApiPromise, WsProvider } from "@polkadot/api";

const provider = new WsProvider(["wss://entrypoint-finney.opentensor.ai:443"], 2500);
const api = await ApiPromise.create({ provider, noInitWarn: true });

const coldkeys = [];
for (let i = 0; i < 3; i++) {
  coldkeys.push(String(await api.query.subtensorModule.stakingColdkeysByIndex(i)));
}

try {
  for (const coldkey of coldkeys) {
    const hotkeys = (await api.query.subtensorModule.stakingHotkeys(coldkey)).toJSON() || [];
    console.log('coldkey', coldkey);
    console.log('hotkeys', hotkeys.slice(0, 3));
    for (const hotkey of hotkeys.slice(0, 2)) {
      for (const netuid of [0,1,3,8,13,19,27,41,64]) {
        try {
          const alpha = await api.query.subtensorModule.alpha(hotkey, coldkey, netuid);
          const raw = Number(String(alpha).replace(/,/g, ''));
          if (raw > 0) {
            console.log(JSON.stringify({ coldkey, hotkey, netuid, raw }));
          }
        } catch {}
      }
    }
  }
} finally {
  await api.disconnect().catch(() => {});
}
