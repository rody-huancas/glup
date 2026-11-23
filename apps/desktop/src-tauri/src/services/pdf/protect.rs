use std::{collections::BTreeMap, path::Path, sync::Arc};

use lopdf::{
    encryption::crypt_filters::{Aes256CryptFilter, CryptFilter},
    Document, EncryptionState, EncryptionVersion, Permissions,
};

use crate::services::pdf::{save, PdfResult, PDF_READ_ERROR, PDF_WRITE_ERROR};

pub const PROTECTED_SUFFIX: &str = "protegido";
pub const UNLOCKED_SUFFIX: &str  = "sin-clave";

pub const MIN_PASSWORD: usize      = 4;
pub const SHORT_PASSWORD: &str     = "La contraseña tiene que tener al menos 4 caracteres";
pub const WRONG_PASSWORD: &str     = "Esa no es la contraseña";
pub const NOT_PROTECTED: &str      = "Este PDF no tiene contraseña";
pub const ALREADY_PROTECTED: &str  = "Este PDF ya tiene contraseña";

const FILTER_NAME: &[u8] = b"StdCF";
const KEY_LENGTH: usize  = 32;

pub fn is_valid_password(password: &str) -> bool {
    password.chars().count() >= MIN_PASSWORD
}

// AES-256 (PDF 2.0, revision 6) with a random file key. The same password opens it and lets it be
// changed: there is a single person behind it, and every permission stays allowed.
pub fn protect(mut document: Document, password: &str) -> PdfResult<Vec<u8>> {
    if !is_valid_password(password) {
        return Err(SHORT_PASSWORD.to_string());
    }
    if document.is_encrypted() || document.trailer.has(b"Encrypt") {
        return Err(ALREADY_PROTECTED.to_string());
    }

    let mut key = [0_u8; KEY_LENGTH];
    getrandom::fill(&mut key).map_err(|_| PDF_WRITE_ERROR.to_string())?;

    let filter: Arc<dyn CryptFilter> = Arc::new(Aes256CryptFilter);
    let state = EncryptionState::try_from(EncryptionVersion::V5 {
        encrypt_metadata    : true,
        crypt_filters       : BTreeMap::from([(FILTER_NAME.to_vec(), filter)]),
        file_encryption_key : &key,
        stream_filter       : FILTER_NAME.to_vec(),
        string_filter       : FILTER_NAME.to_vec(),
        owner_password      : password,
        user_password       : password,
        permissions         : Permissions::all(),
    })
    .map_err(|_| PDF_WRITE_ERROR.to_string())?;

    document.encrypt(&state).map_err(|_| PDF_WRITE_ERROR.to_string())?;
    save(&mut document)
}

// True only for the right password (as the one who opens it or the owner). Reads the trailer and the
// encryption dictionary, not the whole document, so a wrong try answers fast.
pub fn check_password(path: &Path, password: &str) -> bool {
    Document::load_metadata_with_password(path, password).is_ok()
}

// Opens it with the password and writes it again without protection. Never guesses: a wrong password
// is just an error.
pub fn unlock(path: &Path, password: &str) -> PdfResult<Vec<u8>> {
    // Read from the file itself: once opened, lopdf may already have dropped the encryption state.
    let encrypted = Document::load_metadata(path).map(|metadata| metadata.encrypted).unwrap_or(false);
    if !encrypted {
        return Err(NOT_PROTECTED.to_string());
    }

    let mut document = Document::load_with_password(path, password).map_err(|error| match error {
        lopdf::Error::InvalidPassword | lopdf::Error::Decryption(_) => WRONG_PASSWORD.to_string(),
        _                                                           => PDF_READ_ERROR.to_string(),
    })?;

    // Still encrypted means the password did not open it.
    if document.trailer.has(b"Encrypt") {
        return Err(WRONG_PASSWORD.to_string());
    }

    // The objects are already decrypted; forgetting the state saves them as they are, without /Encrypt.
    document.encryption_state = None;
    save(&mut document)
}
