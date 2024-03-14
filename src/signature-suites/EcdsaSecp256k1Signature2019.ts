import type { DocumentLoader, JwsLinkedDataSignatureOptions, Proof } from '@credo-ts/core'
import type { JsonLdDoc } from '@credo-ts/core/build/modules/vc/data-integrity/jsonldUtil'

import { CREDENTIALS_CONTEXT_V1_URL, JwsLinkedDataSignature, SECURITY_CONTEXT_URL, vcLibraries } from '@credo-ts/core'
import { _includesContext } from '@credo-ts/core/build/modules/vc/data-integrity/jsonldUtil'

const { jsonld } = vcLibraries

export const SECURITY_CONTEXT_SECP256k1_URL = 'https://w3id.org/security/suites/secp256k1-2019/v1'

type EcdsaSecp256k1Signature2019Options = Pick<
  JwsLinkedDataSignatureOptions,
  'key' | 'proof' | 'date' | 'useNativeCanonize' | 'LDKeyClass'
>

/**
 * A secp256k1 signature suite for use with k251 key pairs
 */
export class EcdsaSecp256k1Signature2019 extends JwsLinkedDataSignature {
  public static CONTEXT_URL = SECURITY_CONTEXT_SECP256k1_URL

  /**
   * @param {object} options - Options hashmap.
   *
   * Either a `key` OR at least one of `signer`/`verifier` is required.
   *
   * @param {object} [options.key] - An optional key object (containing an
   *   `id` property, and either `signer` or `verifier`, depending on the
   *   intended operation. Useful for when the application is managing keys
   *   itself (when using a KMS, you never have access to the private key,
   *   and so should use the `signer` param instead).
   * @param {Function} [options.signer] - Signer function that returns an
   *   object with an async sign() method. This is useful when interfacing
   *   with a KMS (since you don't get access to the private key and its
   *   `signer()`, the KMS client gives you only the signer function to use).
   * @param {Function} [options.verifier] - Verifier function that returns
   *   an object with an async `verify()` method. Useful when working with a
   *   KMS-provided verifier function.
   *
   * Advanced optional parameters and overrides.
   *
   * @param {object} [options.proof] - A JSON-LD document with options to use
   *   for the `proof` node. Any other custom fields can be provided here
   *   using a context different from security-v2).
   * @param {string|Date} [options.date] - Signing date to use if not passed.
   * @param {boolean} [options.useNativeCanonize] - Whether to use a native
   *   canonize algorithm.
   */
  public constructor(options: EcdsaSecp256k1Signature2019Options) {
    super({
      type: 'EcdsaSecp256k1Signature2019',
      algorithm: 'EcDSA',
      LDKeyClass: options.LDKeyClass,
      contextUrl: SECURITY_CONTEXT_SECP256k1_URL,
      key: options.key,
      proof: options.proof,
      date: options.date,
      useNativeCanonize: options.useNativeCanonize,
    })
    this.requiredKeyType = 'EcdsaSecp256k1VerificationKey2019'
  }

  public async assertVerificationMethod(document: JsonLdDoc) {
    if (!_includesCompatibleContext({ document: document })) {
      // For DID Documents, since keys do not have their own contexts,
      // the suite context is usually provided by the documentLoader logic
      throw new TypeError(
        `The '@context' of the verification method (key) MUST contain the context url "${this.contextUrl}".`
      )
    }

    if (!_isSecp256k12019Key(document)) {
      const verificationMethodType = jsonld.getValues(document, 'type')[0]
      throw new Error(
        `Unsupported verification method type '${verificationMethodType}'. Verification method type MUST be 'EcdsaSecp256k1VerificationKey2019'.`
      )
    } else if (_isSecp256k12019Key(document) && !_includesSecp256k12019Context(document)) {
      throw new Error(
        `For verification method type 'EcdsaSecp256k1VerificationKey2019' the '@context' MUST contain the context url "${SECURITY_CONTEXT_SECP256k1_URL}".`
      )
    }

    // ensure verification method has not been revoked
    if (document.revoked !== undefined) {
      throw new Error('The verification method has been revoked.')
    }
  }

  public async getVerificationMethod(options: { proof: Proof; documentLoader?: DocumentLoader }) {
    const verificationMethod = await super.getVerificationMethod({
      proof: options.proof,
      documentLoader: options.documentLoader,
    })

    return verificationMethod
  }

  /**
   * Ensures the document to be signed contains the required signature suite
   * specific `@context`, by either adding it (if `addSuiteContext` is true),
   * or throwing an error if it's missing.
   *
   * @override
   *
   * @param {object} options - Options hashmap.
   * @param {object} options.document - JSON-LD document to be signed.
   * @param {boolean} options.addSuiteContext - Add suite context?
   */
  public ensureSuiteContext(options: { document: JsonLdDoc; addSuiteContext: boolean }) {
    if (_includesCompatibleContext({ document: options.document })) {
      return
    }

    super.ensureSuiteContext({ document: options.document, addSuiteContext: options.addSuiteContext })
  }
}

function _includesCompatibleContext(options: { document: JsonLdDoc }) {
  // Handle the EcdsaSecp256k1Signature2019 / credentials/v1 collision
  const hasSecp256k1 = _includesContext({
    document: options.document,
    contextUrl: SECURITY_CONTEXT_SECP256k1_URL,
  })
  const hasCred = _includesContext({ document: options.document, contextUrl: CREDENTIALS_CONTEXT_V1_URL })
  const hasSecV2 = _includesContext({ document: options.document, contextUrl: SECURITY_CONTEXT_URL })

  if (hasSecp256k1 && hasCred) {
    // The secp256k1-2019/v1 and credentials/v1 contexts are incompatible.
    // For VCs using EcdsaSecp256k1Signature2019 suite using the credentials/v1 context is sufficient
    return false
  }

  if (hasSecp256k1 && hasSecV2) {
    // The secp256k1-2019/v1 and security/v2 contexts are incompatible.
    // For VCs using EcdsaSecp256k1Signature2019 suite, using the security/v2 context is sufficient.
    return false
  }

  // Either one by itself is fine, for this suite
  return hasSecp256k1 || hasCred || hasSecV2
}

function _isSecp256k12019Key(verificationMethod: JsonLdDoc) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - .hasValue is not part of the public API
  return jsonld.hasValue(verificationMethod, 'type', 'EcdsaSecp256k1VerificationKey2019')
}

function _includesSecp256k12019Context(document: JsonLdDoc) {
  return _includesContext({ document, contextUrl: SECURITY_CONTEXT_SECP256k1_URL })
}
