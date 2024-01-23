import { PolygonDID } from '@ayanworks/polygon-did-registrar'

export const generateSecp256k1KeyPair = async () => {
  const { privateKey, publicKeyBase58, address } = await PolygonDID.createKeyPair()
  return { privateKey, publicKeyBase58, address }
}
