# Credo did:polygon W3C Module

- W3C did:polygon method registry for [credo-ts](https://github.com/openwallet-foundation/credo-ts).

## Usage

```ts
import { PolygonDidResolver, PolygonDidRegistrar, PolygonModule } from 'afj-polygon-w3c-module'

const agent = new Agent({
  config: {
    /* agent config */
  },
  dependencies,
  modules: {
    /* ... */
    dids: new DidsModule({
      resolvers: [ /* ... */, new PolygonDidResolver()],
      registrars: [ /* ... */, new PolygonDidRegistrar()],
    }),
    /* ... */
    polygon: new PolygonModule({
      rpcUrl: 'rpcUrl' // polygon rpc url,
      didContractAddress: 'didContractAddress' // polygon did contract address,
      fileServerToken: 'fileServerToken' // polygon file server token to store schema json,
      schemaManagerContractAddress: 'schemaManagerContractAddress' // polygon schema manager contract address,
      serverUrl: 'serverUrl' // polygon file server url,
    }),
})
```
