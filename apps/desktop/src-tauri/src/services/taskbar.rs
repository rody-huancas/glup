// The Windows taskbar: whether it hides by itself and on which edge. A hidden Glup on that edge would
// compete with it for the cursor (both come out when it rests there), so Ajustes warns about it.
use serde::Serialize;

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskbarState {
    pub autohide : bool,
    // "top", "bottom", "left" or "right"; None if it cannot be read.
    pub edge     : Option<String>,
}

// The edge numbers of ABM_GETTASKBARPOS (ABE_LEFT, ABE_TOP, ABE_RIGHT, ABE_BOTTOM).
pub fn edge_name(edge: u32) -> Option<String> {
    match edge {
        0 => Some("left".to_string()),
        1 => Some("top".to_string()),
        2 => Some("right".to_string()),
        3 => Some("bottom".to_string()),
        _ => None,
    }
}

#[cfg(windows)]
pub fn state() -> TaskbarState {
    use windows_sys::Win32::UI::Shell::{SHAppBarMessage, ABM_GETSTATE, ABM_GETTASKBARPOS, ABS_AUTOHIDE, APPBARDATA};

    unsafe {
        let mut data: APPBARDATA = std::mem::zeroed();
        data.cbSize              = std::mem::size_of::<APPBARDATA>() as u32;

        let flags    = SHAppBarMessage(ABM_GETSTATE, &mut data) as u32;
        let found    = SHAppBarMessage(ABM_GETTASKBARPOS, &mut data) != 0;
        let autohide = flags & ABS_AUTOHIDE as u32 != 0;

        TaskbarState { autohide, edge: if found { edge_name(data.uEdge) } else { None } }
    }
}

#[cfg(not(windows))]
pub fn state() -> TaskbarState {
    TaskbarState::default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_edge_of_windows_has_its_name() {
        assert_eq!(edge_name(0).as_deref(), Some("left"));
        assert_eq!(edge_name(1).as_deref(), Some("top"));
        assert_eq!(edge_name(2).as_deref(), Some("right"));
        assert_eq!(edge_name(3).as_deref(), Some("bottom"));
        assert_eq!(edge_name(9), None);
    }
}
