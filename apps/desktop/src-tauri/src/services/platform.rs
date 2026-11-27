// What Glup still does only on Windows. Every function that is missing on Mac and Linux answers with
// `Unavailable(Feature::…)`, so each one is listed here and easy to find when its turn comes: a clear
// error, never a panic or an empty result that looks like success.
use std::fmt;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Feature {
    // Sacar texto (Windows' OCR).
    ReadText,
    // The face in Foto carné (Windows' face detection).
    FaceDetection,
    // Choosing a piece of the screen (Sacar texto de la pantalla, Leer QR de la pantalla).
    ScreenCapture,
    // Historial del portapapeles and copying images or text from Glup.
    Clipboard,
    // Glup in the right-click menu of the Explorador and in «Enviar a».
    ExplorerMenu,
    // Rendimiento: the PC, its disks and battery, and the apps running.
    Performance,
    // The apps that open with the PC.
    StartupApps,
    // Liberar espacio and the Papelera.
    Cleanup,
    // Carpetas automáticas (watching folders).
    AutoFolders,
    // Conectar a la red Wi-Fi of a QR.
    WifiConnect,
    // FFmpeg (videos, audio and subtitles): the one Glup downloads is Windows'.
    VideoTool,
    // The graphics card for Quitar fondo and Mejorar calidad (DirectML): the processor does it meanwhile.
    GraphicsCard,
}

impl Feature {
    pub fn label(self) -> &'static str {
        match self {
            Feature::ReadText      => "Sacar texto",
            Feature::FaceDetection => "Encontrar la cara en la foto",
            Feature::ScreenCapture => "Elegir una parte de la pantalla",
            Feature::Clipboard     => "El portapapeles",
            Feature::ExplorerMenu  => "El menú del clic derecho",
            Feature::Performance   => "Rendimiento",
            Feature::StartupApps   => "Las apps que abren con la PC",
            Feature::Cleanup       => "Liberar espacio",
            Feature::AutoFolders   => "Carpetas automáticas",
            Feature::WifiConnect   => "Conectarse a una red Wi-Fi",
            Feature::VideoTool     => "Trabajar con videos y audios",
            Feature::GraphicsCard  => "Usar la tarjeta de video",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Unavailable(pub Feature);

impl fmt::Display for Unavailable {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{} todavía no está disponible en este sistema.", self.0.label())
    }
}

impl std::error::Error for Unavailable {}

impl From<Unavailable> for String {
    fn from(error: Unavailable) -> Self {
        error.to_string()
    }
}

// Ok on Windows; elsewhere, the error that says that function is not there yet.
pub fn require(feature: Feature) -> Result<(), Unavailable> {
    if cfg!(windows) { Ok(()) } else { Err(Unavailable(feature)) }
}

// The same error as text, for the stubs that already answer with Result<_, String>.
#[cfg_attr(windows, allow(dead_code))]
pub fn unavailable(feature: Feature) -> String {
    Unavailable(feature).to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn says_which_function_is_missing() {
        assert_eq!(unavailable(Feature::ReadText), "Sacar texto todavía no está disponible en este sistema.");
    }

    #[test]
    fn on_windows_everything_is_there() {
        assert_eq!(require(Feature::Performance).is_ok(), cfg!(windows));
        if let Err(error) = require(Feature::Cleanup) {
            assert_eq!(String::from(error), unavailable(Feature::Cleanup));
        }
    }
}
