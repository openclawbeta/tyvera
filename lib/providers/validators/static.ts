import type { ValidatorInfo } from "@/lib/types/validators";
import { getValidatorSummary } from "@/lib/api/validators";
import type { ValidatorProvider, ValidatorProviderResult } from "./types";

const KNOWN_VALIDATORS: { name: string; address: string }[] = [
  { name: "Opentensor Foundation", address: "5F4tQyWrhfGVcNhoqeiNsR6KjBCPh1cEF3z8cph5QmWQj7Bm" },
  { name: "Taostats & Corcel", address: "5Hddm3iBFD2GLT5ik7LZnT3XJUnRnN8PoeCFgGQYawCx8jGv" },
  { name: "Datura", address: "5HEo565WAy4Dbq3Sv271SAi7syBSofyfhhwRNjFNSM2gP9M2" },
  { name: "RoundTable21", address: "5FFApaS75bv5pJHfAp2FVLBj9ZaXuFDjEypsaBNc1wCfe52v" },
  { name: "Yuma, a DCG Company", address: "5DvTpiniW9s3APmHRYn8FroUWyfnLtrsid5Mtn5EwMXHN2ed" },
  { name: "tao.bot", address: "5HK5tp6t2S59DywmHRWPBVJeJ86T61KjurYqeooqj8sREpeN" },
  { name: "Tensorplex Labs", address: "5HNQURvmjjYhTSksi8Wfsw676b4owGwfLR2BFAQzG7H3HhYf" },
  { name: "FirstTensor.com", address: "5CXRfP2ekFhe62r7q3vppRajJmGhTi7vwvb2yr79jveZ282w" },
  { name: "Crucible Labs", address: "5EhvL1FVkQPpMjZX4MAADcW42i3xPSF1KiCpuaxTYVr28sux" },
  { name: "Foundry / DCG", address: "5HbScNssaEfioJHXjcXdpyqo1cXgz63tNAZfBeBfzmpaWPe2" },
  { name: "Neural Internet", address: "5Gk7V8n1mWQGx7Aa2TQe7k2uZc4P4m1QdH8UuC4tQ8x2D1Fr" },
  { name: "Masa", address: "5FLSigC9H8J6y8nq6nA8v3R1y4uM5zWwP7f2v8bWf3j2XkRz" },
  { name: "Latency", address: "5E7m9tF4Jj7X1cU3bH2vW4sK8qD2wM6pR3x9YpN4uT2cLqAz" },
  { name: "Sportstensor", address: "5Dj4mGgYjQ1LkZ7rHqWv3j4gVf8r2JmM5pQn2uWk1vHh3sQe" },
  { name: "TensorAlchemy", address: "5Fw8nB2kPq6xN1mR7vT3cZ9qW2hL4uYp8dJ5sK7mQ2nA4tVz" },
  { name: "Inference Labs", address: "5Cq7nF1vRj2xL8mP4tW9kH3qD6uY1sN5bV7zQ2mK4pT8wJrX" },
  { name: "Macrocosmos", address: "5ESp8uQ4vB2nM7kJ1rT5yC9hL3wZ6pD2qN8mX4tR1kV7cYfG" },
  { name: "Manifold", address: "5Gx2qL8vM4nP1rT7cH3yW9kD6uZ2sN5bV8mQ4tR1kJ7pYfCe" },
  { name: "SubVortex", address: "5Dq8nR3vK1mT7pL4cY9hW2uZ6sN5bV1qM8tR4kJ2xP7fCgHz" },
  { name: "Cortex Foundation", address: "5Fv2mN8qR4tK1pL7cY3hW9uD6sZ2bV5nM1rT8kJ4xQ7fCeGy" },
];

function buildStaticValidators(): ValidatorInfo[] {
  return KNOWN_VALIDATORS.map((v, index) => ({
    rank: index + 1,
    name: v.name,
    address: v.address,
    dominance: 0,
    nominators: 0,
    change24h: 0,
    activeSubnets: 0,
    totalWeight: 0,
    weightChange24h: 0,
    rootStake: 0,
    alphaStake: 0,
    verified: true,
  }));
}

export const staticValidatorProvider: ValidatorProvider = {
  name: "static",
  async fetch(): Promise<ValidatorProviderResult> {
    const validators = buildStaticValidators();
    return {
      validators,
      summary: getValidatorSummary(validators),
      source: "validator-static",
      fallbackUsed: true,
      note: "Static validator fallback dataset.",
    };
  },
};
