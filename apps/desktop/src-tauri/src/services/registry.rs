// The few registry calls Glup needs: list the values and the subkeys of a key, write one binary value
// ("Al encender la PC") or a text one, and remove a key with everything under it. Only Glup's own keys
// are ever removed (the entries of the Explorer's right click, and the tests' keys).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Root {
    // HKEY_CURRENT_USER: this person's.
    User,
    // HKEY_LOCAL_MACHINE: everyone's (changing it needs an administrator).
    Machine,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Value {
    pub name : String,
    pub data : Vec<u8>,
    // REG_SZ or REG_EXPAND_SZ, as text.
    pub text : Option<String>,
}

#[cfg(windows)]
mod engine {
    use std::ptr::{null, null_mut};

    use windows_sys::Win32::{
        Foundation::{ERROR_SUCCESS, ERROR_MORE_DATA},
        System::Registry::{
            RegCloseKey, RegCreateKeyExW, RegEnumKeyExW, RegEnumValueW, RegOpenKeyExW, RegSetValueExW, HKEY, HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_QUERY_VALUE, KEY_READ,
            KEY_SET_VALUE, REG_BINARY, REG_EXPAND_SZ, REG_OPTION_NON_VOLATILE, REG_SZ,
        },
    };

    use super::{Root, Value};

    fn wide(text: &str) -> Vec<u16> {
        text.encode_utf16().chain(Some(0)).collect()
    }

    fn hkey(root: Root) -> HKEY {
        match root {
            Root::User    => HKEY_CURRENT_USER,
            Root::Machine => HKEY_LOCAL_MACHINE,
        }
    }

    struct Key(HKEY);

    impl Drop for Key {
        fn drop(&mut self) {
            unsafe { RegCloseKey(self.0) };
        }
    }

    fn open(root: Root, path: &str, access: u32) -> Option<Key> {
        let mut key: HKEY = null_mut();
        let status        = unsafe { RegOpenKeyExW(hkey(root), wide(path).as_ptr(), 0, access, &mut key) };
        (status == ERROR_SUCCESS).then_some(Key(key))
    }

    fn create(root: Root, path: &str) -> Option<Key> {
        let mut key: HKEY = null_mut();
        let status        = unsafe { RegCreateKeyExW(hkey(root), wide(path).as_ptr(), 0, null(), REG_OPTION_NON_VOLATILE, KEY_SET_VALUE | KEY_QUERY_VALUE, null(), &mut key, null_mut()) };
        (status == ERROR_SUCCESS).then_some(Key(key))
    }

    fn text_of(data: &[u8]) -> String {
        let units: Vec<u16> = data.chunks_exact(2).map(|pair| u16::from_le_bytes([pair[0], pair[1]])).take_while(|unit| *unit != 0).collect();
        String::from_utf16_lossy(&units)
    }

    pub fn values(root: Root, path: &str) -> Vec<Value> {
        let Some(key) = open(root, path, KEY_READ) else { return Vec::new() };
        let mut found = Vec::new();

        for index in 0.. {
            let mut name      = vec![0_u16; 512];
            let mut data      = vec![0_u8; 8192];
            let mut name_size = name.len() as u32;
            let mut data_size = data.len() as u32;
            let mut kind      = 0_u32;
            let status = unsafe { RegEnumValueW(key.0, index, name.as_mut_ptr(), &mut name_size, null(), &mut kind, data.as_mut_ptr(), &mut data_size) };
            if status == ERROR_MORE_DATA {
                continue;
            }
            if status != ERROR_SUCCESS {
                break;
            }
            data.truncate(data_size as usize);
            let text = (kind == REG_SZ || kind == REG_EXPAND_SZ).then(|| text_of(&data));
            found.push(Value { name: String::from_utf16_lossy(&name[..name_size as usize]), data, text });
        }
        found
    }

    pub fn subkeys(root: Root, path: &str) -> Vec<String> {
        let Some(key) = open(root, path, KEY_READ) else { return Vec::new() };
        let mut found = Vec::new();

        for index in 0.. {
            let mut name = vec![0_u16; 256];
            let mut size = name.len() as u32;
            let status   = unsafe { RegEnumKeyExW(key.0, index, name.as_mut_ptr(), &mut size, null(), null_mut(), null_mut(), null_mut()) };
            if status != ERROR_SUCCESS {
                break;
            }
            found.push(String::from_utf16_lossy(&name[..size as usize]));
        }
        found
    }

    pub fn set_binary(root: Root, path: &str, name: &str, data: &[u8]) -> bool {
        let Some(key) = create(root, path) else { return false };
        unsafe { RegSetValueExW(key.0, wide(name).as_ptr(), 0, REG_BINARY, data.as_ptr(), data.len() as u32) == ERROR_SUCCESS }
    }

    // Glup may write there (HKEY_LOCAL_MACHINE only with an administrator).
    pub fn can_write(root: Root, path: &str) -> bool {
        create(root, path).is_some()
    }

    // The key and everything under it; a key that is not there counts as removed.
    pub fn delete_tree(root: Root, path: &str) -> bool {
        let status = unsafe { windows_sys::Win32::System::Registry::RegDeleteTreeW(hkey(root), wide(path).as_ptr()) };
        status == ERROR_SUCCESS || status == windows_sys::Win32::Foundation::ERROR_FILE_NOT_FOUND
    }

    // One value of a key; one that is not there counts as removed.
    pub fn delete_value(root: Root, path: &str, name: &str) -> bool {
        let Some(key) = open(root, path, KEY_SET_VALUE) else { return true };
        let status    = unsafe { windows_sys::Win32::System::Registry::RegDeleteValueW(key.0, wide(name).as_ptr()) };
        status == ERROR_SUCCESS || status == windows_sys::Win32::Foundation::ERROR_FILE_NOT_FOUND
    }

    // A text value (an empty name is the key's default value); the key is created if needed.
    pub fn set_text(root: Root, path: &str, name: &str, text: &str) -> bool {
        let Some(key) = create(root, path) else { return false };
        let data      = wide(text);
        unsafe { RegSetValueExW(key.0, wide(name).as_ptr(), 0, REG_SZ, data.as_ptr().cast(), (data.len() * 2) as u32) == ERROR_SUCCESS }
    }
}

#[cfg(windows)]
pub use engine::*;

#[cfg(not(windows))]
pub fn values(_: Root, _: &str) -> Vec<Value> {
    Vec::new()
}

#[cfg(not(windows))]
pub fn subkeys(_: Root, _: &str) -> Vec<String> {
    Vec::new()
}

#[cfg(not(windows))]
pub fn set_binary(_: Root, _: &str, _: &str, _: &[u8]) -> bool {
    false
}

#[cfg(not(windows))]
pub fn can_write(_: Root, _: &str) -> bool {
    false
}

#[cfg(not(windows))]
pub fn delete_tree(_: Root, _: &str) -> bool {
    true
}

#[cfg(not(windows))]
pub fn set_text(_: Root, _: &str, _: &str, _: &str) -> bool {
    false
}

#[cfg(not(windows))]
pub fn delete_value(_: Root, _: &str, _: &str) -> bool {
    true
}
