// The name the Windows account shows ("Ana Torres"), for the greeting of Inicio when the person did not
// say how to call them. Never sent anywhere.
// The account's own name (a domain one), or the one Windows shows for the person (a Microsoft account).
#[cfg(windows)]
pub fn display_name() -> Option<String> {
    domain_name().or_else(person_name)
}

#[cfg(windows)]
fn person_name() -> Option<String> {
    use windows::{
        core::{Interface, HSTRING},
        Foundation::IReference,
        System::{KnownUserProperties, User},
    };

    let users = User::FindAllAsync().ok()?.join().ok()?;
    let user  = users.GetAt(0).ok()?;
    for property in [KnownUserProperties::FirstName(), KnownUserProperties::DisplayName()] {
        let value = user.GetPropertyAsync(&property.ok()?).ok()?.join().ok()?;
        let text  = value.cast::<IReference<HSTRING>>().ok().and_then(|text| text.Value().ok()).map(|text| text.to_string_lossy());
        if let Some(text) = text.map(|text| text.trim().to_string()).filter(|text| !text.is_empty()) {
            return Some(text);
        }
    }
    None
}

#[cfg(windows)]
fn domain_name() -> Option<String> {
    use windows_sys::Win32::Security::Authentication::Identity::{GetUserNameExW, NameDisplay};

    let mut size = 0u32;
    unsafe { GetUserNameExW(NameDisplay, std::ptr::null_mut(), &mut size) };
    if size == 0 {
        return None;
    }
    let mut buffer = vec![0u16; size as usize + 1];
    if !unsafe { GetUserNameExW(NameDisplay, buffer.as_mut_ptr(), &mut size) } {
        return None;
    }
    let name = String::from_utf16_lossy(&buffer[..size as usize]).trim().to_string();
    (!name.is_empty()).then_some(name)
}

#[cfg(not(windows))]
pub fn display_name() -> Option<String> {
    None
}

#[cfg(test)]
mod tests {
    // Read from the real account: never empty when there is one, and never with spaces around.
    #[test]
    fn the_account_name_is_clean_when_there_is_one() {
        if let Some(name) = super::display_name() {
            assert!(!name.is_empty() && name.trim() == name);
        }
    }
}
