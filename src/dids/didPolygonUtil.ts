export const polygonDidRegex = new RegExp(/^did:polygon(:testnet)?:0x[0-9a-fA-F]{40}$/)

export const isValidPolygonDid = (did: string) => polygonDidRegex.test(did)
