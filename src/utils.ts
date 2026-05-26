export const ms2secs = (ms: number): number => Math.floor(ms / 1000)

export const sha256 = async (message: string): Promise<string> => {
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message))
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const isValidResetToken = async (token: string): Promise<boolean> => {
  const expectedHash = 'b2e36a2c8b889d537ab34d938f59a8532d2e0e725e59caf68ea664def5269c64'
  const hashHex = await sha256(token)
  return hashHex === expectedHash
}
