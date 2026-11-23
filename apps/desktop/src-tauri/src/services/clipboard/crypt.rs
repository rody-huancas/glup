// What Glup keeps of the clipboard is encrypted with the Windows protection of the person's account
// (DPAPI): only they, signed in on this PC, can read it back. The key never passes through Glup.
pub const CRYPT_ERROR: &str = "No pude proteger lo copiado";

// Extra entropy, so another program of the same user cannot unprotect these files by accident.
#[cfg(windows)]
const ENTROPY: &[u8] = b"glup-portapapeles-v1";

#[cfg(windows)]
mod dpapi {
    use windows_sys::Win32::{
        Foundation::LocalFree,
        Security::Cryptography::{CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB},
    };

    use super::{CRYPT_ERROR, ENTROPY};

    fn blob(bytes: &[u8]) -> CRYPT_INTEGER_BLOB {
        CRYPT_INTEGER_BLOB { cbData: bytes.len() as u32, pbData: bytes.as_ptr() as *mut u8 }
    }

    // Copies the result out and frees the system's buffer.
    unsafe fn take(output: CRYPT_INTEGER_BLOB) -> Vec<u8> {
        let bytes = std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
        LocalFree(output.pbData.cast());
        bytes
    }

    pub fn protect(data: &[u8]) -> Result<Vec<u8>, String> {
        let input   = blob(data);
        let entropy = blob(ENTROPY);
        let mut out = CRYPT_INTEGER_BLOB { cbData: 0, pbData: std::ptr::null_mut() };

        let done = unsafe { CryptProtectData(&input, std::ptr::null(), &entropy, std::ptr::null(), std::ptr::null(), CRYPTPROTECT_UI_FORBIDDEN, &mut out) };
        if done == 0 {
            return Err(CRYPT_ERROR.to_string());
        }
        Ok(unsafe { take(out) })
    }

    pub fn unprotect(data: &[u8]) -> Result<Vec<u8>, String> {
        let input   = blob(data);
        let entropy = blob(ENTROPY);
        let mut out = CRYPT_INTEGER_BLOB { cbData: 0, pbData: std::ptr::null_mut() };

        let done = unsafe { CryptUnprotectData(&input, std::ptr::null_mut(), &entropy, std::ptr::null(), std::ptr::null(), CRYPTPROTECT_UI_FORBIDDEN, &mut out) };
        if done == 0 {
            return Err(CRYPT_ERROR.to_string());
        }
        Ok(unsafe { take(out) })
    }
}

#[cfg(windows)]
pub use dpapi::{protect, unprotect};

// Other systems have no DPAPI: nothing is kept rather than kept in the clear.
#[cfg(not(windows))]
pub fn protect(_data: &[u8]) -> Result<Vec<u8>, String> {
    Err(CRYPT_ERROR.to_string())
}

#[cfg(not(windows))]
pub fn unprotect(_data: &[u8]) -> Result<Vec<u8>, String> {
    Err(CRYPT_ERROR.to_string())
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;

    #[test]
    fn what_is_protected_comes_back_the_same() {
        let secret    = "Mi texto copiado: ñandú 123".as_bytes();
        let protected = protect(secret).unwrap();

        assert_ne!(protected, secret);
        assert!(!protected.windows(secret.len()).any(|window| window == secret));
        assert_eq!(unprotect(&protected).unwrap(), secret);
    }

    #[test]
    fn tampered_or_foreign_data_does_not_open() {
        let mut protected = protect(b"hola").unwrap();
        let last          = protected.len() - 1;
        protected[last]  ^= 0xFF;

        assert!(unprotect(&protected).is_err());
        assert!(unprotect(b"no es de Glup").is_err());
    }

    #[test]
    fn an_empty_copy_also_round_trips() {
        assert_eq!(unprotect(&protect(&[]).unwrap()).unwrap(), Vec::<u8>::new());
    }
}
